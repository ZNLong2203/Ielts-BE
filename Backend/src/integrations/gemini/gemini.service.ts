import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
  GradeWritingDto,
  WritingGradeResponse,
  WritingTaskType,
} from '../../modules/writing/dto/grade-writing.dto';

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
      "weaknesses": ["weakness1", "weakness2", "weakness3"]
    }

    Focus on:
    1. Task Achievement: How well the student addresses the task requirements
    2. Coherence and Cohesion: Organization and linking of ideas
    3. Lexical Resource: Vocabulary range and accuracy
    4. Grammatical Range and Accuracy: Grammar variety and correctness

    Provide constructive feedback that helps the student improve.
    `;
  }

  private parseGradingResponse(text: string): WritingGradeResponse {
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, any>;

      // Validate required fields
      const requiredFields = [
        'overallScore',
        'taskAchievement',
        'coherenceCohesion',
        'lexicalResource',
        'grammaticalRangeAccuracy',
        'detailedFeedback',
        'suggestions',
        'strengths',
        'weaknesses',
      ];

      for (const field of requiredFields) {
        if (parsed[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return parsed as WritingGradeResponse;
    } catch (error) {
      throw new HttpException(
        `Error parsing grading response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
