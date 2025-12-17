import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum WritingTaskType {
  TASK_1 = 'task_1',
  TASK_2 = 'task_2',
}

export class GradeWritingDto {
  @IsString()
  @IsNotEmpty()
  studentAnswer: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsEnum(WritingTaskType)
  @IsNotEmpty()
  taskType: WritingTaskType;

  @IsString()
  @IsOptional()
  wordLimit?: string;

  @IsString()
  @IsOptional()
  additionalInstructions?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string; // For Task 1 - chart, graph, diagram image URL
}

export class WritingGradeResponse {
  overallScore: number;
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRangeAccuracy: number;
  detailedFeedback: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];

  // Các chỉ số chi tiết cho Task 1 & Task 2
  detailedMetrics?: {
    task1?: {
      score: number;
      taskAchievement: number;
      coherenceCohesion: number;
      lexicalResource: number;
      grammaticalRangeAccuracy: number;
      scoreDescription: string;
      criteriaBreakdown: {
        addressingAllParts?: { score: number; level: string; feedback: string };
        comparisons?: { score: number; level: string; feedback: string };
        progression?: { score: number; level: string; feedback: string };
        linkingDevices?: { score: number; level: string; feedback: string };
        paragraphing?: { score: number; level: string; feedback: string };
        vocabularyRange?: { score: number; level: string; feedback: string };
        wordFormation?: { score: number; level: string; feedback: string };
        grammarVariety?: { score: number; level: string; feedback: string };
        accuracy?: { score: number; level: string; feedback: string };
      };
      collocations?: Array<{ phrase: string; context: string }>;
      topicSpecificWords?: string[];
      lexicalErrors?: Array<{
        original: string;
        corrected: string;
        context: string;
      }>;
      grammaticalErrors?: Array<{
        original: string;
        corrected: string;
        context: string;
      }>;
      repetitiveWords?: string[];
      improvements?: string[];
    };
    task2?: {
      score: number;
      taskResponse: number;
      coherenceCohesion: number;
      lexicalResource: number;
      grammaticalRangeAccuracy: number;
      scoreDescription: string;
      criteriaBreakdown: {
        addressingAllParts?: { score: number; level: string; feedback: string };
        position?: { score: number; level: string; feedback: string };
        progression?: { score: number; level: string; feedback: string };
        linkingDevices?: { score: number; level: string; feedback: string };
        paragraphing?: { score: number; level: string; feedback: string };
        vocabularyRange?: { score: number; level: string; feedback: string };
        wordFormation?: { score: number; level: string; feedback: string };
        grammarVariety?: { score: number; level: string; feedback: string };
        accuracy?: { score: number; level: string; feedback: string };
      };
      collocations?: Array<{ phrase: string; context: string }>;
      topicSpecificWords?: string[];
      lexicalErrors?: Array<{
        original: string;
        corrected: string;
        context: string;
      }>;
      grammaticalErrors?: Array<{
        original: string;
        corrected: string;
        context: string;
      }>;
      repetitiveWords?: string[];
      improvements?: string[];
    };
  };

  // Bài luận mẫu nâng cấp
  upgradedEssay?: string;

  // Câu trả lời mẫu
  sampleAnswer?: string;
}
