import { Injectable } from '@nestjs/common';
import * as pronouncing from 'cmu-pronouncing-dictionary';
import * as WavDecoder from 'wav-decoder';

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
  /**
   * Analyze pronunciation and stress patterns from transcription
   * @param transcription Transcribed text
   * @param audioDuration Audio duration in seconds
   * @returns Pronunciation analysis results
   */
  analyzePronunciation(
    transcription: string,
    audioDuration?: number,
  ): PronunciationAnalysisResult {
    const words = this.extractWords(transcription);
    const wordAnalyses: WordAnalysis[] = [];

    // Analyze each word
    for (const word of words) {
      const analysis = this.analyzeWord(word);
      if (analysis) {
        wordAnalyses.push(analysis);
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(
      wordAnalyses,
      transcription,
      audioDuration,
    );

    // Generate feedback
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
  private analyzeWord(word: string): WordAnalysis | null {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:()"'"]/g, '');

    if (!cleanWord) {
      return null;
    }

    // Get pronunciation from CMU dictionary
    const pronunciation = pronouncing.dictionary[cleanWord];

    if (!pronunciation) {
      // Word not found in dictionary - might be proper noun or misspelling
      // Estimate based on common patterns
      return {
        word: cleanWord,
        expectedStress: this.estimateStress(cleanWord),
        phonemes: [],
        syllableCount: this.estimateSyllables(cleanWord),
      };
    }

    // Parse CMU pronunciation format
    // Format: "K AE1 T" where numbers indicate stress (1=primary, 2=secondary, 0=unstressed)
    const parts = pronunciation.split(' ');
    const phonemes: string[] = [];
    const stressPattern: number[] = [];

    for (const part of parts) {
      const stressMatch = part.match(/(\d)$/);
      const phoneme = part.replace(/\d$/, '');
      phonemes.push(phoneme);
      stressPattern.push(stressMatch ? parseInt(stressMatch[1], 10) : 0);
    }

    // Extract syllables (count stressed positions)
    const syllableCount = phonemes.length;

    return {
      word: cleanWord,
      expectedStress: stressPattern,
      phonemes,
      syllableCount,
    };
  }

  /**
   * Estimate stress pattern for words not in dictionary
   */
  private estimateStress(word: string): number[] {
    // Simple heuristic: first syllable often stressed in English
    // This is a simplified approach
    const syllables = this.estimateSyllables(word);
    if (syllables === 0) return [0];

    const stress = [1]; // First syllable stressed
    for (let i = 1; i < syllables; i++) {
      stress.push(0); // Others unstressed
    }
    return stress;
  }

  /**
   * Estimate syllable count using simple vowel counting
   */
  private estimateSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/[^aeiouy]+/g, ' '); // Replace non-vowels with space
    const matches = word.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  }

  /**
   * Extract words from transcription
   */
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

    // Calculate speech rate
    let speechRate = 0;
    if (audioDuration && audioDuration > 0) {
      speechRate = (wordCount / audioDuration) * 60; // Words per minute
    } else {
      // Estimate: average speaking rate is 150-160 WPM
      speechRate = 155;
    }

    // Estimate pause count from punctuation and slow speech
    const punctuationCount = (transcription.match(/[.,!?;:]/g) || []).length;
    const pauseCount = punctuationCount;

    // If speech rate is very slow, might indicate more pauses
    let estimatedPauseCount = pauseCount;
    if (speechRate < 100) {
      // Slow speech might indicate hesitations
      estimatedPauseCount += Math.floor((120 - speechRate) / 10);
    }

    // Average word length (in phonemes)
    const totalPhonemes = words.reduce((sum, w) => sum + w.phonemes.length, 0);
    const averageWordLength =
      words.length > 0 ? totalPhonemes / words.length : 0;

    // Stress pattern match (estimated - we can't detect actual stress from text alone)
    // This is a placeholder that would need audio analysis for real accuracy
    const stressPatternMatch = 75; // Assume 75% match as baseline

    return {
      speechRate: Math.round(speechRate),
      pauseCount: Math.round(estimatedPauseCount),
      averageWordLength: Math.round(averageWordLength * 10) / 10,
      stressPatternMatch,
    };
  }

  /**
   * Generate stress-related feedback
   */
  private generateStressFeedback(words: WordAnalysis[]): string[] {
    const feedback: string[] = [];
    const multiSyllableWords = words.filter((w) => w.syllableCount > 1);

    if (multiSyllableWords.length === 0) {
      feedback.push(
        'Practice with multi-syllable words to improve stress patterns.',
      );
      return feedback;
    }

    // Find words with primary stress
    const stressedWords = multiSyllableWords.filter((w) =>
      w.expectedStress.includes(1),
    );

    if (stressedWords.length < multiSyllableWords.length * 0.5) {
      feedback.push(
        'Pay attention to word stress. Many words need a primary stressed syllable.',
      );
    }

    // Identify common stress patterns
    const commonStressPatterns = new Map<string, number>();
    stressedWords.forEach((w) => {
      const stressPos = w.expectedStress.indexOf(1);
      const pattern = `stress-on-${stressPos === 0 ? 'first' : stressPos === w.expectedStress.length - 1 ? 'last' : 'middle'}-syllable`;
      commonStressPatterns.set(
        pattern,
        (commonStressPatterns.get(pattern) || 0) + 1,
      );
    });

    // Find words with potential stress issues
    const longWords = multiSyllableWords.filter((w) => w.syllableCount >= 3);
    if (longWords.length > 0) {
      feedback.push(
        `Practice stress patterns in longer words (${longWords.length} words with 3+ syllables found).`,
      );
    }

    return feedback;
  }

  /**
   * Calculate overall pronunciation score (0-100)
   */
  private calculatePronunciationScore(
    metrics: PronunciationMetrics,
    words: WordAnalysis[],
  ): number {
    let score = 100;

    // Speech rate penalty (too slow or too fast)
    if (metrics.speechRate < 100) {
      score -= 10; // Too slow
    } else if (metrics.speechRate > 180) {
      score -= 5; // Too fast
    }

    // Pause count (too many pauses indicate hesitation)
    if (metrics.pauseCount > words.length * 0.3) {
      score -= 10; // Too many pauses
    }

    // Stress pattern match (estimated)
    score -= (100 - metrics.stressPatternMatch) * 0.2;

    // Word complexity (more complex words should have better pronunciation)
    const complexWords = words.filter((w) => w.syllableCount >= 3);
    if (complexWords.length > 0 && metrics.stressPatternMatch < 70) {
      score -= 5;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Generate detailed feedback
   */
  private generateDetailedFeedback(
    metrics: PronunciationMetrics,
    words: WordAnalysis[],
    score: number,
  ): string {
    const feedbackParts: string[] = [];

    // Speech rate feedback
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

    // Pause feedback
    if (metrics.pauseCount > words.length * 0.2) {
      feedbackParts.push(
        `Too many pauses detected. Work on fluency and reducing hesitations.`,
      );
    }

    // Stress feedback
    const multiSyllableWords = words.filter((w) => w.syllableCount > 1);
    if (multiSyllableWords.length > 0) {
      feedbackParts.push(
        `Practice word stress in ${multiSyllableWords.length} multi-syllable words. Correct stress improves intelligibility.`,
      );
    }

    // Overall score feedback
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
   * Get audio duration from buffer (if needed)
   * This would require audio processing - for now, we'll estimate or get from metadata
   */
  async getAudioDuration(
    audioBuffer: Buffer,
    fileName: string,
  ): Promise<number | undefined> {
    // If it's a WAV file, we can parse it
    if (fileName.toLowerCase().endsWith('.wav')) {
      try {
        const decoded = await WavDecoder.decode(audioBuffer);
        return decoded.duration;
      } catch (error) {
        // If decoding fails, return undefined
        return undefined;
      }
    }

    // For other formats, would need ffprobe or other tools
    // For now, return undefined and estimate from speech
    return undefined;
  }
}
