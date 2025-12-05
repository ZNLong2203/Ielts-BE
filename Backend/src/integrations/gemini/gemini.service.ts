import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
  GradeWritingDto,
  WritingGradeResponse,
  WritingTaskType,
} from '../../modules/writing/dto/grade-writing.dto';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
  SpeakingPart,
} from '../../modules/speaking/dto/grade-speaking.dto';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    // Initialize GoogleGenAI with API key
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async gradeWriting(
    gradeWritingDto: GradeWritingDto,
    retryCount = 0,
  ): Promise<WritingGradeResponse> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      const prompt = this.createGradingWritingPrompt(gradeWritingDto);

      const response = await this.genAI.models.generateContent({
        model:
          this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Disable thinking for faster response
          },
        },
      });

      return this.parseGradingResponse(response.text || '');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorString = JSON.stringify(error);

      // Check for 503 (overloaded) or 429 (rate limit) errors - retry with exponential backoff
      const isRetryableError =
        errorString.includes('503') ||
        errorString.includes('overloaded') ||
        errorString.includes('429') ||
        errorString.includes('rate limit') ||
        errorString.includes('UNAVAILABLE');

      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s
        console.log(
          `Gemini API overloaded (attempt ${retryCount + 1}/${maxRetries}). Retrying in ${delay}ms...`,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry the request
        return this.gradeWriting(gradeWritingDto, retryCount + 1);
      }

      console.error('Gemini API error (gradeWriting):', errorMessage);
      // Check for network errors
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENOTFOUND')
      ) {
        throw new HttpException(
          `Network error connecting to Gemini API: ${errorMessage}. Please check your internet connection and API key.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // If it's a retryable error but we've exhausted retries
      if (isRetryableError) {
        throw new HttpException(
          `Gemini API is currently overloaded. Please try again later.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Error grading writing: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async gradeSpeaking(
    gradeSpeakingDto: GradeSpeakingDto,
  ): Promise<SpeakingGradeResponse> {
    try {
      const prompt = this.createSpeakingPrompt(gradeSpeakingDto);

      const response = await this.genAI.models.generateContent({
        model:
          this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      return this.parseSpeakingGradingResponse(response.text || '');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Gemini API error (gradeSpeaking):', errorMessage);
      // Check for network errors
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENOTFOUND')
      ) {
        throw new HttpException(
          `Network error connecting to Gemini API: ${errorMessage}. Please check your internet connection and API key.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException(
        `Error grading speaking: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private createSpeakingPrompt(dto: GradeSpeakingDto): string {
    const {
      studentAnswer,
      partType,
      questions,
      additionalInstructions,
      targetDuration,
      pronunciationAnalysis,
    } = dto;

    const partInstructions = this.getPartInstructions(partType);
    const questionsText = questions
      .map(
        (q) => `- ${q.question}${q.context ? ` (Context: ${q.context})` : ''}`,
      )
      .join('\n');

    return `
    You are an IELTS Speaking examiner. Please grade this ${partInstructions} response according to IELTS Speaking band descriptors (Band 0-9).

    PART TYPE: ${partType.toUpperCase()}
    
    QUESTIONS:
    ${questionsText}

    STUDENT ANSWER: ${studentAnswer}

    IMPORTANT PART-SPECIFIC EVALUATION:
    ${
      partType === SpeakingPart.PART_1
        ? `- Part 1 focuses on familiar topics and personal information
    - Evaluate ability to answer questions directly and naturally
    - Look for appropriate use of simple and complex structures
    - Assess naturalness of speech and ability to extend answers slightly`
        : partType === SpeakingPart.PART_2
          ? `- Part 2 requires speaking for 1-2 minutes on a given topic
    - Evaluate ability to organize ideas coherently
    - Assess use of discourse markers and linking devices
    - Look for ability to develop ideas with examples and details
    - Check if student addresses all points on the cue card`
          : `- Part 3 involves abstract discussion and expressing opinions
    - Evaluate ability to discuss abstract ideas and justify opinions
    - Assess use of complex grammar and sophisticated vocabulary
    - Look for ability to analyze, compare, and speculate
    - Check for natural interaction and ability to handle follow-up questions`
    }

   ${targetDuration ? `TARGET DURATION: ${targetDuration}` : ''}
   ${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ''}
   ${
     pronunciationAnalysis
       ? `
    PRONUNCIATION ANALYSIS DATA (from audio analysis):
    - Speech Rate: ${pronunciationAnalysis.metrics.speechRate} words per minute
    - Estimated Pauses: ${pronunciationAnalysis.metrics.pauseCount}
    - Average Word Length: ${pronunciationAnalysis.metrics.averageWordLength} phonemes
    - Stress Pattern Match: ${pronunciationAnalysis.metrics.stressPatternMatch}%
    - Pronunciation Score: ${pronunciationAnalysis.pronunciationScore}/100
    - Stress Feedback: ${pronunciationAnalysis.stressFeedback.join('; ')}
    - Detailed Analysis: ${pronunciationAnalysis.detailedFeedback}
    
    IMPORTANT: Use this pronunciation analysis data to inform your pronunciation score (0-9 band scale).
    Consider the speech rate, stress patterns, and pronunciation feedback when assessing pronunciation.
    The pronunciation score above (0-100) should be converted to IELTS band scale (0-9).
    `
       : ''
   }

   Please provide a detailed assessment in the following JSON format:
   {
     "overallScore": [number from 0-9],
     "fluencyCoherence": [number from 0-9],
     "lexicalResource": [number from 0-9],
     "grammaticalRangeAccuracy": [number from 0-9],
     "pronunciation": [number from 0-9],
     "detailedFeedback": "[detailed explanation of the all scores and performance]",
     "partResponse": {
       "fluencyCoherence": [number from 0-9],
       "lexicalResource": [number from 0-9], 
       "grammaticalRangeAccuracy": [number from 0-9],
       "pronunciation": [number from 0-9],
       "feedback": "[specific feedback for this part]"
     },
     "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
     "strengths": ["strength1", "strength2", "strength3"],
     "weaknesses": ["weakness1", "weakness2", "weakness3"]
   }

   Focus on:
   1. Fluency and Coherence: Speech rate, self-correction, effort in production, organization and development of ideas
     ${
       pronunciationAnalysis
         ? `   - Consider the speech rate (${pronunciationAnalysis.metrics.speechRate} WPM) and pause count when assessing fluency`
         : ''
     }
   2. Lexical Resource: Vocabulary range, flexibility, word formation, paraphrase ability
   3. Grammatical Range and Accuracy: Grammar variety, complexity, correctness
   4. Pronunciation: Intelligibility, phonetic features, stress and rhythm, intonation
     ${
       pronunciationAnalysis
         ? `   - USE the pronunciation analysis data provided above to inform your pronunciation score
     - Consider the stress pattern match (${pronunciationAnalysis.metrics.stressPatternMatch}%) and pronunciation score (${pronunciationAnalysis.pronunciationScore}/100)
     - Convert the pronunciation analysis insights into IELTS band scale (0-9)`
         : ''
     }

   Provide constructive feedback that helps the student improve their speaking skills.
   ${
     pronunciationAnalysis
       ? `   - Include specific feedback about stress patterns, speech rate, and pronunciation based on the analysis data`
       : ''
   }
    `;
  }

  private createGradingWritingPrompt(dto: GradeWritingDto): string {
    const {
      studentAnswer,
      question,
      taskType,
      wordLimit,
      additionalInstructions,
      imageUrl,
    } = dto;

    const taskInstructions =
      taskType === WritingTaskType.TASK_1
        ? 'Task 1: Academic Writing - Describe visual information (charts, graphs, diagrams)'
        : 'Task 2: Academic Writing - Write an essay responding to a point of view, argument or problem';

    return `
    You are an IELTS Writing examiner. Please grade this ${taskInstructions} response according to the official IELTS Writing band descriptors (Band 0-9).

    QUESTION: ${question}

    ${
      imageUrl
        ? `VISUAL INFORMATION (Chart/Graph/Diagram): Please analyze the image at this URL: ${imageUrl}
    
    IMPORTANT FOR TASK 1: The student's answer should describe the visual information accurately, make comparisons where relevant, and highlight key features. Evaluate how well they:
    - Identify and describe main trends, patterns, or features
    - Make appropriate comparisons between data points
    - Use accurate data from the visual
    - Organize information logically
    - Use appropriate vocabulary for describing visuals (e.g., "increased", "decreased", "fluctuated", "remained stable")
    
    `
        : ''
    }

    STUDENT ANSWER: ${studentAnswer}

   ${wordLimit ? `WORD LIMIT: ${wordLimit}` : ''}
   ${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ''}

   Please provide a detailed assessment in the following JSON format:
   {
     "overallScore": [number from 0-9],
     "taskAchievement": [number from 0-9],
     "coherenceCohesion": [number from 0-9],
     "lexicalResource": [number from 0-9],
     "grammaticalRangeAccuracy": [number from 0-9],
     "detailedFeedback": "[detailed explanation of the score and performance]",
     "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
     "strengths": ["strength1", "strength2", "strength3"],
     "weaknesses": ["weakness1", "weakness2", "weakness3"],
     "detailedMetrics": {
       "task1": {
         "score": [number from 0-9],
         "taskAchievement": [number from 0-9],
         "coherenceCohesion": [number from 0-9],
         "lexicalResource": [number from 0-9],
         "grammaticalRangeAccuracy": [number from 0-9],
         "scoreDescription": "[detailed description of what this score means in Vietnamese]",
         "criteriaBreakdown": {
           "addressingAllParts": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "comparisons": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "progression": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "linkingDevices": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "paragraphing": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "vocabularyRange": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "wordFormation": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "grammarVariety": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           },
           "accuracy": {
             "score": [number 0-100],
             "level": "Excellent|Very Good|Good|Needs Improvement",
             "feedback": "[specific feedback]"
           }
         },
         "collocations": [
           {"phrase": "phrase1", "context": "sentence where it appears"}
         ],
         "topicSpecificWords": ["word1", "word2"],
         "lexicalErrors": [
           {"original": "wrong word", "corrected": "correct word", "context": "sentence"}
         ],
         "grammaticalErrors": [
           {"original": "wrong grammar", "corrected": "correct grammar", "context": "sentence"}
         ],
         "repetitiveWords": ["word1", "word2"],
         "improvements": ["improvement1", "improvement2"]
       },
       "task2": {
         "score": [number from 0-9],
         "taskResponse": [number from 0-9],
         "coherenceCohesion": [number from 0-9],
         "lexicalResource": [number from 0-9],
         "grammaticalRangeAccuracy": [number from 0-9],
         "scoreDescription": "[detailed description in Vietnamese]",
         "criteriaBreakdown": { /* same structure as task1 */ },
         "collocations": [ /* same as task1 */ ],
         "topicSpecificWords": [ /* same as task1 */ ],
         "lexicalErrors": [ /* same as task1 */ ],
         "grammaticalErrors": [ /* same as task1 */ ],
         "repetitiveWords": [ /* same as task1 */ ],
         "improvements": [ /* same as task1 */ ]
       }
     },
     "upgradedEssay": "[An improved version of the student's essay with the same content but better language]",
     "sampleAnswer": "[A sample high-quality answer to this question]"
   }

   SCORING INSTRUCTIONS - FOLLOW IELTS BAND DESCRIPTORS:
   
   You must evaluate each of the 4 criteria independently using official IELTS band descriptors. Each criterion can have a different score. Do not assign the same score to all criteria unless the performance is truly identical across all areas.
   
   STRICT SCORING GUIDELINES (Based on Official IELTS Band Descriptors):
   
   1. Task Achievement (Task 1) / Task Response (Task 2): 
      - Task 1: 
        * Band 9: Fully satisfies all requirements; presents a clear overview; key features are clearly highlighted
        * Band 7: Covers requirements; presents a clear overview; key features are clearly presented
        * Band 6: Addresses requirements; presents an overview with information appropriately selected
        * Band 5: Generally addresses the task; format may be inappropriate; may lack clear overview
        * Band 4: Attempts to address the task; may not present a clear overview; key features may be inadequately covered
        * Band 3 and below: Does not adequately address any part of the task; fails to communicate any message
      - Task 2:
        * Band 9: Fully addresses all parts; presents a fully developed position; extends and supports main ideas
        * Band 7: Addresses all parts; presents a clear position; presents, extends and supports main ideas
        * Band 6: Addresses all parts; presents a relevant position; presents relevant main ideas
        * Band 5: Addresses the task only partially; presents a position but development is not always clear
        * Band 4: Responds to the task only in a minimal way; position is unclear
        * Band 3 and below: Does not adequately address any part of the task; does not express a clear position
      - PENALIZE SEVERELY if: answer is too short, off-topic, does not address the question, or lacks required content
   
   2. Coherence and Cohesion:
      - Band 9: Uses cohesion in such a way that it attracts no attention; skilfully manages paragraphing
      - Band 7: Logically organises information; uses a range of cohesive devices; clear paragraphing
      - Band 6: Arranges information coherently; uses cohesive devices effectively; adequate paragraphing
      - Band 5: Presents information with some organisation; uses cohesive devices inaccurately; may lack paragraphing
      - Band 4: Presents information and ideas but lacks clear organisation; uses basic cohesive devices inaccurately
      - Band 3 and below: Fails to organise ideas logically; uses very limited cohesive devices
      - PENALIZE if: ideas are not logically organized, paragraphing is poor, or cohesive devices are misused
   
   3. Lexical Resource:
      - Band 9: Uses a wide range of vocabulary with very natural control; rare minor errors
      - Band 7: Uses a sufficient range of vocabulary; some less common items; occasional errors
      - Band 6: Uses an adequate range of vocabulary; attempts to use less common vocabulary; some errors
      - Band 5: Uses a limited range of vocabulary; frequent errors; may cause difficulty for the reader
      - Band 4: Uses only basic vocabulary; limited control of word formation; errors cause difficulty
      - Band 3 and below: Uses only a very limited range of words; errors predominate
      - PENALIZE if: vocabulary is repetitive, basic, or inaccurate; word formation errors are frequent
   
   4. Grammatical Range and Accuracy:
      - Band 9: Uses a wide range of structures with full flexibility and accuracy; rare minor errors
      - Band 7: Uses a variety of complex structures; frequent error-free sentences; good control
      - Band 6: Uses a mix of simple and complex sentence forms; some errors but meaning is clear
      - Band 5: Uses only a limited range of structures; frequent errors; meaning may be unclear
      - Band 4: Uses only a very limited range of structures; errors predominate; meaning is often unclear
      - Band 3 and below: Attempts sentence forms but errors predominate; meaning is unclear
      - PENALIZE if: grammar is basic, errors are frequent, or meaning is unclear
   
   PENALTY RULES:
   - If the answer is extremely short (e.g., less than 50 words for Task 1, less than 100 words for Task 2), automatically penalize all criteria severely (Band 3-4 maximum)
   - If the answer is completely off-topic or does not address the question, Task Achievement/Response should be Band 3 or lower
   - If the answer contains mostly irrelevant content or random text, score should not exceed Band 4 overall
   - If there are frequent errors that impede communication, penalize Lexical Resource and Grammatical Range and Accuracy accordingly
   - Do not give Band 6.0 or higher to answers that are clearly inadequate, too short, or off-topic
   
   IMPORTANT: 
   - Each criterion should be scored separately (0-9 scale, in 0.5 increments)
   - Scores can and should differ if performance varies across criteria
   - For example: A student might have good vocabulary (7.0) but poor grammar (5.0)
   - If an answer does not meet the requirements for a band, score it appropriately based on the band descriptors
   - Provide detailed description in Vietnamese explaining what each score means
   - Extract all collocations (word partnerships), topic-specific vocabulary, identify all errors with corrections, and provide specific improvements.
   
   JSON REQUIREMENTS:
   1. You MUST return ONLY valid JSON - no markdown code blocks, no explanation text before or after
   2. Escape ALL quotes inside string values: use escape backslash-quote instead of plain quote
   3. Escape all special characters in string values: double backslash for backslash, backslash-n for newline
   4. Ensure proper closing of all arrays and objects
   5. No trailing commas in arrays or objects
   6. Return raw JSON only - do not wrap in code blocks
   `;
  }

  private getPartInstructions(partType: SpeakingPart): string {
    switch (partType) {
      case SpeakingPart.PART_1:
        return 'Part 1: Introduction and Interview - Answering familiar topics (4-5 minutes)';
      case SpeakingPart.PART_2:
        return 'Part 2: Individual Long Turn - Speaking on a topic for 1-2 minutes (includes 1 minute preparation)';
      case SpeakingPart.PART_3:
        return 'Part 3: Two-way Discussion - Discussing abstract issues related to Part 2 topic (4-5 minutes)';
      default:
        return 'IELTS Speaking Test';
    }
  }

  private parseSpeakingGradingResponse(text: string): SpeakingGradeResponse {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, any>;

      const requiredFields = [
        'overallScore',
        'fluencyCoherence',
        'lexicalResource',
        'grammaticalRangeAccuracy',
        'pronunciation',
        'detailedFeedback',
        'partResponse',
        'suggestions',
        'strengths',
        'weaknesses',
      ];

      for (const field of requiredFields) {
        if (parsed[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return parsed as SpeakingGradeResponse;
    } catch (error) {
      throw new HttpException(
        `Error parsing speaking grading response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private parseGradingResponse(text: string): WritingGradeResponse {
    try {
      // Try to extract JSON from the response with better error handling
      let jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]) as Record<string, any>;
      } catch (parseError) {
        let cleanedJson = jsonMatch[0];

        cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');

        cleanedJson = cleanedJson.replace(
          /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
          '$1"$2":',
        );

        for (let i = 0; i < 5; i++) {
          cleanedJson = cleanedJson.replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
          cleanedJson = cleanedJson.replace(/,\s*\}/g, '}'); // Remove trailing commas in objects
        }

        // Fix incomplete array elements
        cleanedJson = cleanedJson.replace(/,\s*,/g, ','); // Remove double commas
        cleanedJson = cleanedJson.replace(/\[\s*,/g, '['); // Remove leading comma in arrays
        cleanedJson = cleanedJson.replace(/{\s*,/g, '{'); // Remove leading comma in objects

        cleanedJson = cleanedJson.replace(
          /:\s*"([^"]*(?:\\.[^"]*)*)"/g,
          (match, content) => {
            // Check if content already has properly escaped quotes
            if (content.includes('\\"')) {
              return match;
            }
            // Escape unescaped quotes (avoid lookbehind which may not work in all engines)
            let escaped = '';
            for (let i = 0; i < content.length; i++) {
              if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
                escaped += '\\"';
              } else {
                escaped += content[i];
              }
            }
            return `: "${escaped}"`;
          },
        );

        cleanedJson = cleanedJson.replace(
          /:\s*"([^"]*)"([^,}\]]*)/g,
          (match, content, after) => {
            // If there's content after the closing quote that looks like it should be part of the string
            const afterTrimmed = String(after).trim();
            if (afterTrimmed && !String(after).match(/^[\s]*[,}\]\]]/)) {
              // This might be a malformed string, try to fix it
              return `: "${String(content).replace(/"/g, '\\"')}"`;
            }
            return match;
          },
        );

        // Fix unclosed arrays/objects
        const openBraces = (cleanedJson.match(/\{/g) || []).length;
        const closeBraces = (cleanedJson.match(/\}/g) || []).length;
        const openBrackets = (cleanedJson.match(/\[/g) || []).length;
        const closeBrackets = (cleanedJson.match(/\]/g) || []).length;

        if (openBraces > closeBraces) {
          cleanedJson += '}'.repeat(openBraces - closeBraces);
        }
        if (openBrackets > closeBrackets) {
          cleanedJson += ']'.repeat(openBrackets - closeBrackets);
        }

        try {
          parsed = JSON.parse(cleanedJson);
        } catch (secondError) {
          try {
            const essentialFields = [
              'overallScore',
              'taskAchievement',
              'coherenceCohesion',
              'lexicalResource',
              'grammaticalRangeAccuracy',
            ];

            const extracted: any = {};

            // Try to extract numeric fields
            for (const field of essentialFields) {
              const regex = new RegExp(
                `"${field}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`,
                'g',
              );
              const match = cleanedJson.match(regex);
              if (match) {
                const value = match[0].match(/(\d+(?:\.\d+)?)/);
                if (value) {
                  extracted[field] = parseFloat(value[1]);
                }
              }
            }

            // Try to extract string fields with better quote handling
            const stringFields = [
              'detailedFeedback',
              'upgradedEssay',
              'sampleAnswer',
            ];

            for (const field of stringFields) {
              const regex = new RegExp(
                `"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
                'gs',
              );
              const match = cleanedJson.match(regex);
              if (match) {
                // Extract content between quotes, handling escaped quotes
                const content = match[0]
                  .replace(new RegExp(`"${field}"\\s*:\\s*"`), '')
                  .replace(/"\s*[,}]/, '');
                extracted[field] = content.replace(/\\"/g, '"');
              }
            }

            // Try to extract arrays
            const arrayFields = ['suggestions', 'strengths', 'weaknesses'];
            for (const field of arrayFields) {
              const regex = new RegExp(
                `"${field}"\\s*:\\s*\\[([^\\]]*)\\]`,
                'gs',
              );
              const match = cleanedJson.match(regex);
              if (match) {
                try {
                  // Try to parse the array content
                  const arrayContent = match[1];
                  const items = arrayContent
                    .split(',')
                    .map((item) => {
                      const cleaned = item.trim().replace(/^"|"$/g, '');
                      return cleaned.replace(/\\"/g, '"');
                    })
                    .filter((item) => item.length > 0);
                  extracted[field] = items;
                } catch {
                  extracted[field] = [];
                }
              }
            }

            // If we extracted at least the essential fields, use them
            if (Object.keys(extracted).length >= essentialFields.length) {
              // Merge with defaults
              parsed = {
                ...this.getDefaultWritingResponse(),
                ...extracted,
              };
            } else {
              throw new Error('Could not extract essential fields');
            }
          } catch (extractionError) {
            console.error('Failed to parse AI response:', parseError);
            console.error('Cleaned JSON failed:', secondError);
            console.error('Field extraction failed:', extractionError);
            console.log(
              'First 200 chars of JSON:',
              cleanedJson.substring(0, 200),
            );
            // Try to get error position from secondError if available
            const errorPos = (secondError as Error).message.match(
              /position (\d+)/,
            );
            if (errorPos) {
              const pos = parseInt(errorPos[1], 10);
              console.log(
                `Around error position (${pos}):`,
                cleanedJson.substring(Math.max(0, pos - 150), pos + 150),
              );
            }
            return this.getDefaultWritingResponse();
          }
        }
      }

      const requiredFields = [
        'overallScore',
        'taskAchievement',
        'coherenceCohesion',
        'lexicalResource',
        'grammaticalRangeAccuracy',
      ];

      for (const field of requiredFields) {
        if (parsed[field] === undefined) {
          parsed[field] = 0;
        }
      }

      if (!parsed.detailedFeedback)
        parsed.detailedFeedback = 'No detailed feedback available.';
      if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];
      if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
      if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = [];

      return parsed as WritingGradeResponse;
    } catch (error) {
      console.error('Error parsing grading response:', error);
      return this.getDefaultWritingResponse();
    }
  }

  private getDefaultWritingResponse(): WritingGradeResponse {
    return {
      overallScore: 0,
      taskAchievement: 0,
      coherenceCohesion: 0,
      lexicalResource: 0,
      grammaticalRangeAccuracy: 0,
      detailedFeedback: 'Unable to parse AI response. Please try again.',
      suggestions: [],
      strengths: [],
      weaknesses: [],
    };
  }
}
