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
    this.genAI = new GoogleGenAI({});
  }

  async gradeWriting(
    gradeWritingDto: GradeWritingDto,
  ): Promise<WritingGradeResponse> {
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
      throw new HttpException(
        `Error grading writing: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      throw new HttpException(
        `Error grading speaking: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    } = dto;

    const partInstructions = this.getPartInstructions(partType);
    const questionsText = questions
      .map(
        (q) => `- ${q.question}${q.context ? ` (Context: ${q.context})` : ''}`,
      )
      .join('\n');

    return `
    You are an IELTS Speaking examiner. Please grade this ${partInstructions} response according to IELTS Speaking band descriptors.

    PART TYPE: ${partType.toUpperCase()}
    
    QUESTIONS:
    ${questionsText}

    STUDENT ANSWER: ${studentAnswer}

   ${targetDuration ? `TARGET DURATION: ${targetDuration}` : ''}
   ${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ''}

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
   2. Lexical Resource: Vocabulary range, flexibility, word formation, paraphrase ability
   3. Grammatical Range and Accuracy: Grammar variety, complexity, correctness
   4. Pronunciation: Intelligibility, phonetic features, stress and rhythm, intonation

   Provide constructive feedback that helps the student improve their speaking skills.
    `;
  }

  private createGradingWritingPrompt(dto: GradeWritingDto): string {
    const {
      studentAnswer,
      question,
      taskType,
      wordLimit,
      additionalInstructions,
    } = dto;

    const taskInstructions =
      taskType === WritingTaskType.TASK_1
        ? 'Task 1: Academic Writing - Describe visual information (charts, graphs, diagrams)'
        : 'Task 2: Academic Writing - Write an essay responding to a point of view, argument or problem';

    return `
    You are an IELTS Writing examiner. Please grade this ${taskInstructions} response according to IELTS Writing band descriptors.

    QUESTION: ${question}

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

   Focus on:
   1. Task Achievement: How well the student addresses the task requirements
   2. Coherence and Cohesion: Organization and linking of ideas
   3. Lexical Resource: Vocabulary range and accuracy
   4. Grammatical Range and Accuracy: Grammar variety and correctness

   IMPORTANT: For each score level, provide detailed description in Vietnamese explaining what this score means. Extract all collocations (word partnerships), topic-specific vocabulary, identify all errors with corrections, and provide specific improvements.
   
   CRITICAL JSON REQUIREMENTS:
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

        // Replace unescaped " with \" inside string values
        cleanedJson = cleanedJson.replace(
          /("(?:[^"\\]|\\.)*")\s*:/g,
          (match, key) => {
            return match;
          },
        );

        cleanedJson = cleanedJson.replace(
          /:\s*"([^"]*)"/g,
          (match, content) => {
            const escaped = content.replace(/"/g, '\\"');
            return `: "${escaped}"`;
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
            const lines = cleanedJson.split('\n');
            let newJson = '';
            for (const line of lines) {
              if (
                line.trim() &&
                !line.trim().match(/[\]\}]/) &&
                !line.includes(':')
              ) {
                continue;
              }
              newJson += line + '\n';
            }
            parsed = JSON.parse(newJson);
          } catch {
            console.error('Failed to parse AI response:', parseError);
            console.error('Cleaned JSON failed:', secondError);
            console.log(
              'First 200 chars of JSON:',
              cleanedJson.substring(0, 200),
            );
            console.log(
              'Around error position (10973):',
              cleanedJson.substring(10900, 11050),
            );
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
