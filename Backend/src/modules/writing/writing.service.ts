/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWritingDto } from './dto/create-writing.dto';
import { UpdateWritingDto } from './dto/update-writing.dto';
import {
  SubmitWritingDto,
  WritingSubmissionResponse,
} from './dto/submit-writing.dto';
import {
  GradeWritingSubmissionDto,
  WritingGradeResponse,
} from './dto/grade-writing-submission.dto';
import { QueryWritingDto } from './dto/query-writing.dto';
import {
  GradeWritingDto,
  WritingGradeResponse as GeminiWritingGradeResponse,
} from './dto/grade-writing.dto';
import {
  SaveWritingAssessmentDto,
  WritingAssessmentResponse,
} from './dto/save-writing-assessment.dto';

interface WritingContent {
  taskType?: string;
  questionType?: string;
  questionText?: string;
  questionImage?: string;
  questionChart?: string;
  wordLimit?: number;
  keywords?: string[];
  sampleAnswers?: string[];
}

@Injectable()
export class WritingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async create(createWritingDto: CreateWritingDto) {
    const content = {
      taskType: createWritingDto.taskType,
      questionType: createWritingDto.questionType,
      questionText: createWritingDto.questionText,
      questionImage: createWritingDto.questionImage,
      questionChart: createWritingDto.questionChart,
      wordLimit: createWritingDto.wordLimit,
      keywords: createWritingDto.keywords,
      sampleAnswers: createWritingDto.sampleAnswers,
    };

    const writing = await this.prisma.prisma.exercises.create({
      data: {
        lesson_id: createWritingDto.lessonId,
        title: createWritingDto.title,
        instruction: createWritingDto.instruction,
        content,
        time_limit: createWritingDto.timeLimit,
        max_attempts: createWritingDto.maxAttempts || 1,
        passing_score: createWritingDto.passingScore,
        ordering: createWritingDto.ordering || 0,
        is_active:
          createWritingDto.isActive !== undefined
            ? createWritingDto.isActive
            : true,
      },
      include: {
        lessons: true,
      },
    });

    return writing;
  }

  async findAll(queryDto: QueryWritingDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      ...filters
    } = queryDto;

    const where: Record<string, any> = {
      deleted: false,
      ...(filters.lessonId && { lesson_id: filters.lessonId }),
      ...(filters.search && {
        title: {
          contains: filters.search,
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.prisma.exercises.findMany({
        where,
        include: {
          lessons: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prisma.exercises.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    const writing = await this.prisma.prisma.exercises.findFirst({
      where: { id, deleted: false },
      include: {
        lessons: true,
        user_submissions: {
          include: {
            question_answers: true,
          },
        },
      },
    });

    if (!writing) {
      throw new NotFoundException(`Writing exercise with ID ${id} not found`);
    }

    return writing;
  }

  async update(id: string, updateWritingDto: UpdateWritingDto) {
    const writing = await this.findOne(id);

    const updateData: Record<string, any> = {
      ...updateWritingDto,
    };

    if (
      updateWritingDto.taskType ||
      updateWritingDto.questionType ||
      updateWritingDto.questionText
    ) {
      const currentContent = (writing.content as WritingContent) || {};
      updateData.content = {
        ...currentContent,
        taskType: updateWritingDto.taskType || currentContent.taskType,
        questionType:
          updateWritingDto.questionType || currentContent.questionType,
        questionText:
          updateWritingDto.questionText || currentContent.questionText,
        questionImage:
          updateWritingDto.questionImage || currentContent.questionImage,
        questionChart:
          updateWritingDto.questionChart || currentContent.questionChart,
        wordLimit: updateWritingDto.wordLimit || currentContent.wordLimit,
        keywords: updateWritingDto.keywords || currentContent.keywords,
        sampleAnswers:
          updateWritingDto.sampleAnswers || currentContent.sampleAnswers,
      };
    }

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const updatedWriting = await this.prisma.prisma.exercises.update({
      where: { id },
      data: updateData,
      include: {
        lessons: true,
      },
    });

    return updatedWriting;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.prisma.exercises.update({
      where: { id },
      data: { deleted: true },
    });
  }

  async submitWriting(
    userId: string,
    submitDto: SubmitWritingDto,
  ): Promise<WritingSubmissionResponse> {
    const writing = await this.findOne(submitDto.exerciseId);

    // Check if user has exceeded max attempts
    const existingSubmissions = await this.prisma.prisma.user_submissions.count(
      {
        where: {
          exercise_id: submitDto.exerciseId,
          user_id: userId,
        },
      },
    );

    if (existingSubmissions >= (writing.max_attempts || 1)) {
      throw new BadRequestException(
        'Maximum attempts exceeded for this exercise',
      );
    }

    // Create submission
    const submission = await this.prisma.prisma.user_submissions.create({
      data: {
        user_id: userId,
        exercise_id: submitDto.exerciseId,
        attempt_number: existingSubmissions + 1,
        answers: {
          answerText: submitDto.answerText,
          timeSpent: submitDto.timeSpent,
          wordCount: submitDto.wordCount,
        },
        time_taken: submitDto.timeSpent,
        status: 'submitted',
      },
    });

    return {
      id: submission.id,
      exerciseId: submission.exercise_id || '',
      answerText: submitDto.answerText,
      timeSpent: submitDto.timeSpent,
      status: submission.status || 'submitted',
      createdAt: submission.created_at || new Date(),
    };
  }

  async gradeWritingByGemini(
    gradeWritingDto: GradeWritingDto,
  ): Promise<GeminiWritingGradeResponse> {
    return await this.geminiService.gradeWriting(gradeWritingDto);
  }

  async gradeWritingSubmission(
    teacherId: string,
    gradeDto: GradeWritingSubmissionDto,
  ): Promise<WritingGradeResponse> {
    const submission = await this.prisma.prisma.user_submissions.update({
      where: { id: gradeDto.submissionId },
      data: {
        teacher_score: gradeDto.teacherScore,
        teacher_feedback: gradeDto.teacherFeedback,
        status: gradeDto.status || 'graded',
        graded_by: teacherId,
        graded_at: new Date(),
      },
    });

    return {
      id: submission.id,
      submissionId: submission.id,
      teacherScore: Number(submission.teacher_score || 0),
      maxScore: Number(submission.max_score || 0),
      teacherFeedback: submission.teacher_feedback || undefined,
      status: submission.status || 'graded',
      detailedFeedback: gradeDto.detailedFeedback,
      suggestions: gradeDto.suggestions,
      strengths: gradeDto.strengths,
      weaknesses: gradeDto.weaknesses,
      gradedBy: teacherId,
      gradedAt: submission.graded_at || new Date(),
    };
  }

  async getSubmissionsByExercise(exerciseId: string) {
    const submissions = await this.prisma.prisma.user_submissions.findMany({
      where: { exercise_id: exerciseId },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        question_answers: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return submissions;
  }

  async getSubmissionsByUser(userId: string) {
    const submissions = await this.prisma.prisma.user_submissions.findMany({
      where: { user_id: userId },
      include: {
        exercises: {
          select: {
            id: true,
            title: true,
            instruction: true,
          },
        },
        question_answers: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return submissions;
  }

  // Save writing assessment
  async saveWritingAssessment(
    userId: string,
    saveDto: SaveWritingAssessmentDto,
  ): Promise<WritingAssessmentResponse> {
    const assessment = await (
      this.prisma.prisma as any
    ).writing_assessments.create({
      data: {
        user_id: userId,
        exercise_id: saveDto.exerciseId || null,
        task_type: saveDto.taskType,
        question: saveDto.question,
        student_answer: saveDto.studentAnswer,
        word_limit: saveDto.wordLimit,
        additional_instructions: saveDto.additionalInstructions,
        overall_score: saveDto.overallScore,
        task_achievement_score: saveDto.taskAchievementScore,
        coherence_cohesion_score: saveDto.coherenceCohesionScore,
        lexical_resource_score: saveDto.lexicalResourceScore,
        grammatical_range_accuracy_score: saveDto.grammaticalRangeAccuracyScore,
        detailed_feedback: saveDto.detailedFeedback,
        suggestions: saveDto.suggestions || [],
        strengths: saveDto.strengths || [],
        weaknesses: saveDto.weaknesses || [],
        detailed_metrics: saveDto.detailedMetrics || {},
        upgraded_essay: saveDto.upgradedEssay,
        sample_answer: saveDto.sampleAnswer,
        ai_model: saveDto.aiModel || 'gemini-2.5-flash',
        status: 'completed',
      },
    });

    return {
      id: assessment.id,
      userId: assessment.user_id,
      exerciseId: assessment.exercise_id || undefined,
      taskType: assessment.task_type,
      question: assessment.question,
      studentAnswer: assessment.student_answer,
      wordLimit: assessment.word_limit || undefined,
      additionalInstructions: assessment.additional_instructions || undefined,
      overallScore: Number(assessment.overall_score),
      taskAchievementScore: Number(assessment.task_achievement_score),
      coherenceCohesionScore: Number(assessment.coherence_cohesion_score),
      lexicalResourceScore: Number(assessment.lexical_resource_score),
      grammaticalRangeAccuracyScore: Number(
        assessment.grammatical_range_accuracy_score,
      ),
      detailedFeedback: assessment.detailed_feedback || '',
      suggestions: assessment.suggestions as string[],
      strengths: assessment.strengths as string[],
      weaknesses: assessment.weaknesses as string[],
      detailedMetrics: assessment.detailed_metrics,
      upgradedEssay: assessment.upgraded_essay || undefined,
      sampleAnswer: assessment.sample_answer || undefined,
      aiModel: assessment.ai_model || undefined,
      gradingMethod: assessment.grading_method,
      status: assessment.status || '',
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at,
    };
  }

  // Get writing assessments by user
  async getWritingAssessmentsByUser(
    userId: string,
    exerciseId?: string,
    taskType?: string,
  ): Promise<WritingAssessmentResponse[]> {
    const where: any = { user_id: userId, deleted: false };

    if (exerciseId) {
      where.exercise_id = exerciseId;
    }

    if (taskType) {
      where.task_type = taskType;
    }
    const assessments = await (
      this.prisma.prisma as any
    ).writing_assessments.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return assessments.map((assessment) => ({
      id: assessment.id,
      userId: assessment.user_id,
      exerciseId: assessment.exercise_id || undefined,
      taskType: assessment.task_type,
      question: assessment.question,
      studentAnswer: assessment.student_answer,
      wordLimit: assessment.word_limit || undefined,
      additionalInstructions: assessment.additional_instructions || undefined,
      overallScore: Number(assessment.overall_score),
      taskAchievementScore: Number(assessment.task_achievement_score),
      coherenceCohesionScore: Number(assessment.coherence_cohesion_score),
      lexicalResourceScore: Number(assessment.lexical_resource_score),
      grammaticalRangeAccuracyScore: Number(
        assessment.grammatical_range_accuracy_score,
      ),
      detailedFeedback: assessment.detailed_feedback || '',
      suggestions: assessment.suggestions as string[],
      strengths: assessment.strengths as string[],
      weaknesses: assessment.weaknesses as string[],
      detailedMetrics: assessment.detailed_metrics,
      upgradedEssay: assessment.upgraded_essay || undefined,
      sampleAnswer: assessment.sample_answer || undefined,
      aiModel: assessment.ai_model || undefined,
      gradingMethod: assessment.grading_method,
      status: assessment.status || '',
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at,
    }));
  }

  // Get writing assessment by ID
  async getWritingAssessmentById(
    id: string,
  ): Promise<WritingAssessmentResponse | null> {
    const assessment = await (
      this.prisma.prisma as any
    ).writing_assessments.findFirst({
      where: { id, deleted: false },
    });

    if (!assessment) return null;

    return {
      id: assessment.id,
      userId: assessment.user_id,
      exerciseId: assessment.exercise_id || undefined,
      taskType: assessment.task_type,
      question: assessment.question,
      studentAnswer: assessment.student_answer,
      wordLimit: assessment.word_limit || undefined,
      additionalInstructions: assessment.additional_instructions || undefined,
      overallScore: Number(assessment.overall_score),
      taskAchievementScore: Number(assessment.task_achievement_score),
      coherenceCohesionScore: Number(assessment.coherence_cohesion_score),
      lexicalResourceScore: Number(assessment.lexical_resource_score),
      grammaticalRangeAccuracyScore: Number(
        assessment.grammatical_range_accuracy_score,
      ),
      detailedFeedback: assessment.detailed_feedback || '',
      suggestions: assessment.suggestions as string[],
      strengths: assessment.strengths as string[],
      weaknesses: assessment.weaknesses as string[],
      detailedMetrics: assessment.detailed_metrics,
      upgradedEssay: assessment.upgraded_essay || undefined,
      sampleAnswer: assessment.sample_answer || undefined,
      aiModel: assessment.ai_model || undefined,
      gradingMethod: assessment.grading_method,
      status: assessment.status || '',
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at,
    };
  }
}
