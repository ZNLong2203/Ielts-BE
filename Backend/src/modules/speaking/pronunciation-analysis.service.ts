import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export interface WordAnalysis {
  word: string;
  expectedStress: number[]; // Stress pattern: 1 = primary stress, 2 = secondary stress, 0 = unstressed
  phonemes: string[];
  syllableCount: number;
}

export interface PronunciationMetrics {
  speechRate: number; // Words per minute
  pauseCount: number; // Estimated from punctuation and slow speech rate
  averageWordLength: number;
  stressPatternMatch: number; // Percentage of words with correct stress (estimated)
}

export interface PronunciationAnalysisResult {
  transcription: string;
  words: WordAnalysis[];
  metrics: PronunciationMetrics;
  stressFeedback: string[];
  pronunciationScore: number; // 0-100
  detailedFeedback: string;
}

@Injectable()
export class PronunciationAnalysisService {
  private readonly logger = new Logger(PronunciationAnalysisService.name);
  private pronouncingDictionary: Record<string, string> | null = null;
  private readonly pythonScriptPath: string;
  private readonly pythonExecutable: string;

  constructor() {
    this.pythonScriptPath = path.join(
      process.cwd(),
      'pronunciation-analysis',
      'pronunciation_analyzer.py',
    );

    this.pythonExecutable =
      process.env.PYTHON_PATH ||
      (process.platform === 'darwin' ? '/usr/bin/python3' : 'python3');

    this.logger.debug(`Using Python executable: ${this.pythonExecutable}`);
  }

  private async loadDictionary(): Promise<Record<string, string>> {
    if (!this.pronouncingDictionary) {
      const pronouncing = await import('cmu-pronouncing-dictionary');
      const module = pronouncing.default || pronouncing;
      this.pronouncingDictionary =
        (module.dictionary as unknown as Record<string, string>) ||
        (module as unknown as Record<string, string>);
    }
    return this.pronouncingDictionary;
  }

  /**
   * Analyze pronunciation and stress patterns from audio and transcription
   * Uses Parselmouth (Python) for real audio analysis if audioBuffer is provided
   * Falls back to text-based analysis if audio is not available
   * @param transcription Transcribed text
   * @param audioDuration Audio duration in seconds
   * @param audioBuffer Optional audio buffer for real pronunciation analysis
   * @param fileName Optional audio file name
   * @returns Pronunciation analysis results
   */
  async analyzePronunciation(
    transcription: string,
    audioDuration?: number,
    audioBuffer?: Buffer,
    fileName?: string,
  ): Promise<PronunciationAnalysisResult> {
    if (!transcription || transcription.trim().length === 0) {
      this.logger.warn('Empty transcription detected, returning default analysis');
      return {
        transcription: '',
        words: [],
        metrics: {
          speechRate: 0,
          pauseCount: 0,
          averageWordLength: 0,
          stressPatternMatch: 0,
        },
        stressFeedback: [
          'No speech detected. Please ensure your microphone is working and try recording again.',
        ],
        pronunciationScore: 0,
        detailedFeedback:
          'No audio transcription was detected. This may indicate:\n' +
          '1. The microphone was not working properly\n' +
          '2. The audio file was empty or corrupted\n' +
          '3. The recording was too quiet or silent\n\n' +
          'Please check your microphone settings and try recording again.',
      };
    }

    // Check if audio buffer is too small (likely empty/silent)
    if (audioBuffer && audioBuffer.length < 1000) {
      this.logger.warn('Audio buffer is very small, likely empty or silent');
    }

    if (audioBuffer && fileName) {
      try {
        return await this.analyzePronunciationFromAudio(
          audioBuffer,
          fileName,
          transcription,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to analyze pronunciation from audio, falling back to text-based analysis: ${error}`,
        );
      }
    }

    const words = this.extractWords(transcription);
    
    // If no words extracted, return default analysis
    if (words.length === 0) {
      this.logger.warn('No words extracted from transcription');
      return {
        transcription,
        words: [],
        metrics: {
          speechRate: 0,
          pauseCount: 0,
          averageWordLength: 0,
          stressPatternMatch: 0,
        },
        stressFeedback: [
          'No meaningful words detected in the transcription.',
        ],
        pronunciationScore: 0,
        detailedFeedback:
          'The transcription did not contain recognizable words. Please ensure you are speaking clearly.',
      };
    }

    const wordAnalyses: WordAnalysis[] = [];
    const pronouncing = await this.loadDictionary();

    for (const word of words) {
      const analysis = this.analyzeWord(word, pronouncing);
      if (analysis) {
        wordAnalyses.push(analysis);
      }
    }

    const metrics = this.calculateMetrics(
      wordAnalyses,
      transcription,
      audioDuration,
    );

    const stressFeedback = this.generateStressFeedback(wordAnalyses);
    const pronunciationScore = this.calculatePronunciationScore(
      metrics,
      wordAnalyses,
    );
    const detailedFeedback = this.generateDetailedFeedback(
      metrics,
      wordAnalyses,
      pronunciationScore,
    );

    return {
      transcription,
      words: wordAnalyses,
      metrics,
      stressFeedback,
      pronunciationScore,
      detailedFeedback,
    };
  }

  /**
   * Analyze individual word for stress and pronunciation patterns
   */
  private analyzeWord(
    word: string,
    dictionary: Record<string, string>,
  ): WordAnalysis | null {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:()"'"]/g, '');

    if (!cleanWord) {
      return null;
    }

    const pronunciation = dictionary[cleanWord];

    if (!pronunciation || typeof pronunciation !== 'string') {
      return {
        word: cleanWord,
        expectedStress: this.estimateStress(cleanWord),
        phonemes: [],
        syllableCount: this.estimateSyllables(cleanWord),
      };
    }
    const parts = pronunciation.split(' ');
    const phonemes: string[] = [];
    const stressPattern: number[] = [];

    for (const part of parts) {
      const stressMatch = part.match(/(\d)$/);
      const phoneme = part.replace(/\d$/, '');
      phonemes.push(phoneme);
      stressPattern.push(stressMatch ? parseInt(stressMatch[1], 10) : 0);
    }

    const syllableCount = phonemes.length;

    return {
      word: cleanWord,
      expectedStress: stressPattern,
      phonemes,
      syllableCount,
    };
  }

  private estimateStress(word: string): number[] {
    const syllables = this.estimateSyllables(word);
    if (syllables === 0) return [0];

    const stress = [1];
    for (let i = 1; i < syllables; i++) {
      stress.push(0);
    }
    return stress;
  }
  private estimateSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/[^aeiouy]+/g, ' ');
    const matches = word.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  }
  private extractWords(text: string): string[] {
    return text
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  /**
   * Calculate pronunciation metrics
   */
  private calculateMetrics(
    words: WordAnalysis[],
    transcription: string,
    audioDuration?: number,
  ): PronunciationMetrics {
    const wordCount = words.length;

    let speechRate = 0;
    if (audioDuration && audioDuration > 0) {
      speechRate = (wordCount / audioDuration) * 60;
    } else {
      speechRate = 155;
    }

    const punctuationCount = (transcription.match(/[.,!?;:]/g) || []).length;
    const pauseCount = punctuationCount;
    let estimatedPauseCount = pauseCount;
    if (speechRate < 100) {
      estimatedPauseCount += Math.floor((120 - speechRate) / 10);
    }

    const totalPhonemes = words.reduce((sum, w) => sum + w.phonemes.length, 0);
    const averageWordLength =
      words.length > 0 ? totalPhonemes / words.length : 0;

    const multiSyllableWords = words.filter((w) => w.syllableCount > 1);
    let stressPatternMatch = 70;

    if (multiSyllableWords.length > 0) {
      const avgSyllables =
        multiSyllableWords.reduce((sum, w) => sum + w.syllableCount, 0) /
        multiSyllableWords.length;
      stressPatternMatch = Math.max(60, 70 - (avgSyllables - 2) * 5);
    }

    return {
      speechRate: Math.round(speechRate),
      pauseCount: Math.round(estimatedPauseCount),
      averageWordLength: Math.round(averageWordLength * 10) / 10,
      stressPatternMatch,
    };
  }

  private generateStressFeedback(words: WordAnalysis[]): string[] {
    const feedback: string[] = [];
    const multiSyllableWords = words.filter((w) => w.syllableCount > 1);

    if (multiSyllableWords.length === 0) {
      feedback.push(
        'Practice with multi-syllable words to improve stress patterns.',
      );
      return feedback;
    }

    const stressedWords = multiSyllableWords.filter((w) =>
      w.expectedStress.includes(1),
    );

    if (stressedWords.length < multiSyllableWords.length * 0.5) {
      feedback.push(
        'Pay attention to word stress. Many words need a primary stressed syllable.',
      );
    }

    const commonStressPatterns = new Map<string, number>();
    stressedWords.forEach((w) => {
      const stressPos = w.expectedStress.indexOf(1);
      const pattern = `stress-on-${stressPos === 0 ? 'first' : stressPos === w.expectedStress.length - 1 ? 'last' : 'middle'}-syllable`;
      commonStressPatterns.set(
        pattern,
        (commonStressPatterns.get(pattern) || 0) + 1,
      );
    });

    const longWords = multiSyllableWords.filter((w) => w.syllableCount >= 3);
    if (longWords.length > 0) {
      feedback.push(
        `Practice stress patterns in longer words (${longWords.length} words with 3+ syllables found).`,
      );
    }

    return feedback;
  }

  private calculatePronunciationScore(
    metrics: PronunciationMetrics,
    words: WordAnalysis[],
  ): number {
    let score = 0;
    score += metrics.stressPatternMatch * 0.4;

    let fluencyScore = 100;
    if (metrics.speechRate < 100) {
      fluencyScore = Math.max(50, 100 - (100 - metrics.speechRate) * 0.5);
    } else if (metrics.speechRate > 180) {
      fluencyScore = Math.max(60, 100 - (metrics.speechRate - 180) * 0.3);
    } else if (metrics.speechRate >= 140 && metrics.speechRate <= 160) {
      fluencyScore = 100;
    } else {
      fluencyScore = 85;
    }
    score += fluencyScore * 0.3;

    const pauseRatio = metrics.pauseCount / words.length;
    let pauseScore = 100;
    if (pauseRatio > 0.3) {
      pauseScore = Math.max(40, 100 - (pauseRatio - 0.3) * 200);
    } else if (pauseRatio > 0.2) {
      pauseScore = 70;
    } else if (pauseRatio > 0.1) {
      pauseScore = 85;
    }
    score += pauseScore * 0.2;

    const complexWords = words.filter((w) => w.syllableCount >= 3);
    let complexityScore = 100;
    if (complexWords.length > 0) {
      const complexRatio = complexWords.length / words.length;
      if (complexRatio > 0.3 && metrics.stressPatternMatch < 70) {
        complexityScore = 60;
      } else if (complexRatio > 0.2 && metrics.stressPatternMatch < 75) {
        complexityScore = 75;
      }
    }
    score += complexityScore * 0.1;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private generateDetailedFeedback(
    metrics: PronunciationMetrics,
    words: WordAnalysis[],
    score: number,
  ): string {
    const feedbackParts: string[] = [];

    if (metrics.speechRate < 100) {
      feedbackParts.push(
        `Speech rate is slow (${metrics.speechRate} WPM). Aim for 140-160 WPM for natural conversation.`,
      );
    } else if (metrics.speechRate > 180) {
      feedbackParts.push(
        `Speech rate is very fast (${metrics.speechRate} WPM). Slow down slightly for better clarity.`,
      );
    } else {
      feedbackParts.push(`Speech rate is good (${metrics.speechRate} WPM).`);
    }

    if (metrics.pauseCount > words.length * 0.2) {
      feedbackParts.push(
        `Too many pauses detected. Work on fluency and reducing hesitations.`,
      );
    }

    const multiSyllableWords = words.filter((w) => w.syllableCount > 1);
    if (multiSyllableWords.length > 0) {
      feedbackParts.push(
        `Practice word stress in ${multiSyllableWords.length} multi-syllable words. Correct stress improves intelligibility.`,
      );
    }

    if (score >= 80) {
      feedbackParts.push(
        'Pronunciation is good overall. Continue practicing to maintain clarity.',
      );
    } else if (score >= 60) {
      feedbackParts.push(
        'Pronunciation needs improvement. Focus on stress patterns and speech rate.',
      );
    } else {
      feedbackParts.push(
        'Pronunciation requires significant practice. Consider working with a tutor or pronunciation guide.',
      );
    }

    return feedbackParts.join(' ');
  }

  /**
   * Analyze pronunciation from audio using Python script (Parselmouth)
   * @param audioBuffer Audio buffer
   * @param fileName Audio file name
   * @param transcription Transcribed text
   * @returns Pronunciation analysis results
   */
  private async analyzePronunciationFromAudio(
    audioBuffer: Buffer,
    fileName: string,
    transcription: string,
  ): Promise<PronunciationAnalysisResult> {
    const tempDir = os.tmpdir();
    const tempAudioPath = path.join(
      tempDir,
      `audio-${Date.now()}-${path.basename(fileName)}`,
    );
    const tempWavPath = path.join(tempDir, `audio-${Date.now()}.wav`);

    try {
      fs.writeFileSync(tempAudioPath, audioBuffer);

      const isWav = fileName.toLowerCase().endsWith('.wav');
      const finalAudioPath = isWav ? tempAudioPath : tempWavPath;

      if (!isWav) {
        try {
          await new Promise<void>((resolve, reject) => {
            ffmpeg(tempAudioPath)
              .setFfmpegPath(ffmpegInstaller.path)
              .audioCodec('pcm_s16le')
              .audioFrequency(16000)
              .audioChannels(1)
              .format('wav')
              .on('end', () => resolve())
              .on('error', (err) => reject(err))
              .save(tempWavPath);
          });
        } catch (convertError) {
          this.logger.warn(`Failed to convert audio to WAV: ${convertError}`);
          if (!fs.existsSync(tempWavPath)) {
            throw new Error(
              `Failed to convert audio to WAV: ${convertError instanceof Error ? convertError.message : 'Unknown error'}`,
            );
          }
        }
      }

      this.logger.debug(
        `Executing Python script: ${this.pythonExecutable} ${this.pythonScriptPath} ${finalAudioPath}`,
      );

      if (!fs.existsSync(this.pythonScriptPath)) {
        this.logger.error(`Python script not found: ${this.pythonScriptPath}`);
        throw new Error(`Python script not found: ${this.pythonScriptPath}`);
      }

      if (!fs.existsSync(finalAudioPath)) {
        this.logger.error(`Audio file not found: ${finalAudioPath}`);
        throw new Error(`Audio file not found: ${finalAudioPath}`);
      }

      const stdout: string[] = [];
      const stderr: string[] = [];

      const pythonProcess = spawn(this.pythonExecutable, [
        this.pythonScriptPath,
        finalAudioPath,
        transcription,
      ]);

      pythonProcess.stdout.on('data', (data: Buffer) => {
        stdout.push(data.toString());
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr.push(data.toString());
      });

      // Add timeout to prevent hanging
      const timeout = 60000; // 60 seconds
      const timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        this.logger.error('Python script execution timeout');
      }, timeout);

      const exitCode = await new Promise<number>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          clearTimeout(timeoutId);
          resolve(code || 0);
        });
        pythonProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          this.logger.error(`Failed to spawn Python process: ${error}`);
          reject(error);
        });
      });

      const stdoutStr = stdout.join('');
      const stderrStr = stderr.join('');

      this.logger.debug(
        `Python script stdout (first 500 chars): ${stdoutStr.substring(0, 500)}`,
      );
      if (stderrStr) {
        this.logger.debug(`Python script stderr: ${stderrStr}`);
      }

      if (exitCode !== 0) {
        this.logger.error(
          `Python script exited with code ${exitCode}: ${stderrStr}`,
        );
        throw new Error(
          `Python script failed with exit code ${exitCode}: ${stderrStr}`,
        );
      }

      if (stderrStr) {
        this.logger.warn(`Python script stderr: ${stderrStr}`);
      }

      // Validate stdout before parsing
      if (!stdoutStr || stdoutStr.trim().length === 0) {
        this.logger.error('Python script returned empty output');
        throw new Error('Python script returned empty output');
      }

      // Parse JSON result
      let result: {
        error?: string;
        transcription?: string;
        words?: Array<{
          word: string;
          expectedStress: number[];
          actualStress: number[];
          phonemes: string[];
          syllableCount: number;
        }>;
        metrics?: {
          stressPatternMatch: number;
          audioDuration: number;
        };
        stressFeedback?: string[];
        pronunciationScore?: number;
        detailedFeedback?: string;
      };
      try {
        result = JSON.parse(stdoutStr) as typeof result;
      } catch (parseError) {
        this.logger.error(
          `Failed to parse Python script output: ${stdoutStr.substring(0, 500)}`,
        );
        throw new Error(
          `Failed to parse Python script output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        );
      }

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.words || !Array.isArray(result.words)) {
        throw new Error('Python script did not return words array');
      }

      const wordAnalyses: WordAnalysis[] = result.words.map((w) => ({
        word: w.word || '',
        expectedStress: Array.isArray(w.expectedStress) ? w.expectedStress : [],
        actualStress: Array.isArray(w.actualStress) ? w.actualStress : [],
        phonemes: Array.isArray(w.phonemes) ? w.phonemes : [],
        syllableCount:
          typeof w.syllableCount === 'number' ? w.syllableCount : 0,
      }));

      const audioDuration = result.metrics?.audioDuration || 0;
      const words = this.extractWords(transcription);
      const speechRate =
        audioDuration > 0 ? (words.length / audioDuration) * 60 : 155;
      const punctuationCount = (transcription.match(/[.,!?;:]/g) || []).length;
      const pauseCount = punctuationCount;
      const totalPhonemes = wordAnalyses.reduce(
        (sum, w) => sum + w.phonemes.length,
        0,
      );
      const averageWordLength =
        wordAnalyses.length > 0 ? totalPhonemes / wordAnalyses.length : 0;

      const metrics: PronunciationMetrics = {
        speechRate: Math.round(speechRate),
        pauseCount: Math.round(pauseCount),
        averageWordLength: Math.round(averageWordLength * 10) / 10,
        stressPatternMatch: result.metrics?.stressPatternMatch || 0,
      };

      const stressFeedback = result.stressFeedback || [];
      const detailedFeedback = result.detailedFeedback || '';
      let pronunciationScore = result.pronunciationScore || 0;

      if (speechRate < 100) {
        pronunciationScore -= 5;
      } else if (speechRate > 180) {
        pronunciationScore -= 3;
      }

      if (pauseCount > words.length * 0.3) {
        pronunciationScore -= 5;
      }

      pronunciationScore = Math.max(0, Math.min(100, pronunciationScore));

      return {
        transcription: result.transcription || transcription,
        words: wordAnalyses,
        metrics,
        stressFeedback,
        pronunciationScore: Math.round(pronunciationScore),
        detailedFeedback,
      };
    } catch (error) {
      this.logger.error(`Error analyzing pronunciation from audio: ${error}`);
      this.logger.warn('Falling back to text-based pronunciation analysis');
      return await this.analyzePronunciation(transcription, undefined);
    } finally {
      try {
        if (fs.existsSync(tempAudioPath)) {
          fs.unlinkSync(tempAudioPath);
        }
        if (fs.existsSync(tempWavPath) && tempWavPath !== tempAudioPath) {
          fs.unlinkSync(tempWavPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp files: ${cleanupError}`);
      }
    }
  }
}
