/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import { CreateWritingMockTestExerciseDto } from './dto/create-writing-mock-test.dto';
import { UpdateWritingMockTestExerciseDto } from './dto/update-writing-mock-test.dto';
import { SECTION_TYPE } from '../mock-tests/constants';
import { EXERCISE_TYPE, SKILL_TYPE } from '../reading/types/reading.types';

export interface WritingContent {
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
  private readonly logger = new Logger(WritingService.name);

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

  /**
   * Remove null bytes (0x00) from strings to prevent PostgreSQL encoding errors
   */
  private cleanString(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') {
      return value || null;
    }
    // Remove null bytes (0x00) from string
    return value.replace(/\0/g, '');
  }

  /**
   * Clean null bytes from array of strings
   */
  private cleanStringArray(
    value: string[] | null | undefined,
  ): string[] | null {
    if (!value || !Array.isArray(value)) {
      return value || null;
    }
    return value.map((item) => this.cleanString(item) || '').filter(Boolean);
  }

  /**
   * Clean null bytes from object recursively
   */
  private cleanObject(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === 'string') {
      return this.cleanString(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.cleanObject(item));
    }
    if (typeof value === 'object') {
      const cleaned: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          cleaned[key] = this.cleanObject(value[key]);
        }
      }
      return cleaned;
    }
    return value;
  }

  // Save writing assessment
  async saveWritingAssessment(
    userId: string,
    saveDto: SaveWritingAssessmentDto,
  ): Promise<WritingAssessmentResponse> {
    // Clean all string fields to remove null bytes
    const cleanedData = {
      user_id: userId,
      exercise_id: saveDto.exerciseId || null,
      task_type: this.cleanString(saveDto.taskType) || '',
      question: this.cleanString(saveDto.question) || '',
      student_answer: this.cleanString(saveDto.studentAnswer) || '',
      word_limit: saveDto.wordLimit || null,
      additional_instructions: this.cleanString(saveDto.additionalInstructions),
      overall_score: saveDto.overallScore,
      task_achievement_score: saveDto.taskAchievementScore,
      coherence_cohesion_score: saveDto.coherenceCohesionScore,
      lexical_resource_score: saveDto.lexicalResourceScore,
      grammatical_range_accuracy_score: saveDto.grammaticalRangeAccuracyScore,
      detailed_feedback: this.cleanString(saveDto.detailedFeedback),
      suggestions: this.cleanStringArray(saveDto.suggestions) || [],
      strengths: this.cleanStringArray(saveDto.strengths) || [],
      weaknesses: this.cleanStringArray(saveDto.weaknesses) || [],
      detailed_metrics: this.cleanObject(saveDto.detailedMetrics) || {},
      upgraded_essay: this.cleanString(saveDto.upgradedEssay),
      sample_answer: this.cleanString(saveDto.sampleAnswer),
      ai_model: this.cleanString(saveDto.aiModel) || 'gemini-2.5-flash',
      status: 'completed',
    };

    const assessment = await (
      this.prisma.prisma as any
    ).writing_assessments.create({
      data: cleanedData,
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

  /**
   * Create Writing Exercise in test section (for mock tests)
   */
  async createExerciseForMockTest(createDto: CreateWritingMockTestExerciseDto) {
    // Validate test_section exists and is writing type
    const testSection = await this.prisma.prisma.test_sections.findFirst({
      where: {
        id: createDto.test_section_id,
        section_type: SECTION_TYPE.WRITING,
        deleted: false,
      },
      include: {
        mock_tests: {
          select: {
            id: true,
            title: true,
            test_type: true,
          },
        },
      },
    });

    if (!testSection) {
      throw new NotFoundException('Writing test section not found');
    }

    // Check if exercise with same title exists in this test section
    const existingExercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        test_section_id: createDto.test_section_id,
        title: createDto.title,
        deleted: false,
      },
    });

    if (existingExercise) {
      throw new ConflictException(
        'Exercise with this title already exists in this test section',
      );
    }

    const exerciseContent: WritingContent = {
      taskType: createDto.task_type,
      questionType: createDto.question_type,
      questionText: createDto.question_text,
      questionImage: createDto.question_image,
      questionChart: createDto.question_chart,
      wordLimit: createDto.word_limit,
      keywords: createDto.keywords,
      sampleAnswers: createDto.sample_answers,
    };

    const exercise = await this.prisma.prisma.exercises.create({
      data: {
        test_section_id: createDto.test_section_id,
        lesson_id: null, // Mock test exercise doesn't belong to lesson
        title: createDto.title,
        instruction: createDto.instruction || '',
        content: exerciseContent as unknown as Prisma.JsonObject,
        exercise_type: EXERCISE_TYPE.MOCK_TEST,
        skill_type: SKILL_TYPE.WRITING,
        time_limit: createDto.time_limit || 20,
        max_attempts: 1, // Mock tests typically allow 1 attempt
        passing_score: createDto.passing_score || 70,
        ordering: createDto.ordering || 0,
        is_active: true,
      },
      include: {
        test_sections: {
          include: {
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
        _count: {
          select: {
            questions: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    this.logger.log(
      `Created writing exercise: ${exercise.title} in test section: ${testSection.section_name}`,
    );
    return exercise;
  }

  /**
   * Get Writing Exercises by test section (for mock tests)
   */
  async getExercisesByTestSectionForMockTest(testSectionId: string) {
    // Validate test section exists
    const testSection = await this.prisma.prisma.test_sections.findFirst({
      where: {
        id: testSectionId,
        section_type: SECTION_TYPE.WRITING,
        deleted: false,
      },
      include: {
        mock_tests: {
          select: {
            id: true,
            title: true,
            test_type: true,
          },
        },
      },
    });

    if (!testSection) {
      throw new NotFoundException('Writing test section not found');
    }

    const exercises = await this.prisma.prisma.exercises.findMany({
      where: {
        test_section_id: testSectionId,
        skill_type: SKILL_TYPE.WRITING,
        deleted: false,
      },
      include: {
        _count: {
          select: {
            questions: {
              where: { deleted: false },
            },
          },
        },
      },
      orderBy: { ordering: 'asc' },
    });

    return {
      test_section: {
        id: testSection.id,
        section_name: testSection.section_name,
        mock_test: testSection.mock_tests,
      },
      exercises: exercises.map((ex) => ({
        ...ex,
        writing_content: ex.content as WritingContent,
        total_questions: ex._count.questions,
      })),
    };
  }

  /**
   * Get Writing Exercise by ID with complete details (for mock tests)
   */
  async getExerciseByIdForMockTest(id: string) {
    const exercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.WRITING,
        deleted: false,
      },
      include: {
        test_sections: {
          include: {
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Writing exercise not found');
    }

    const content = exercise.content as WritingContent;

    return {
      ...exercise,
      writing_content: content,
    };
  }

  /**
   * Update Writing Exercise (for mock tests)
   */
  async updateExerciseForMockTest(
    id: string,
    updateDto: UpdateWritingMockTestExerciseDto,
  ) {
    const existingExercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.WRITING,
        deleted: false,
      },
    });

    if (!existingExercise) {
      throw new NotFoundException('Writing exercise not found');
    }

    // Check for title conflict if title is being updated
    if (updateDto.title && updateDto.title !== existingExercise.title) {
      const conflictingExercise = await this.prisma.prisma.exercises.findFirst({
        where: {
          test_section_id: existingExercise.test_section_id,
          title: updateDto.title,
          deleted: false,
          id: { not: id },
        },
      });

      if (conflictingExercise) {
        throw new ConflictException(
          'Exercise with this title already exists in this test section',
        );
      }
    }

    const existingContent = (existingExercise.content as WritingContent) || {};

    const updatedContent: WritingContent = {
      ...existingContent,
      taskType: updateDto.task_type || existingContent.taskType,
      questionType: updateDto.question_type || existingContent.questionType,
      questionText: updateDto.question_text || existingContent.questionText,
      questionImage: updateDto.question_image || existingContent.questionImage,
      questionChart: updateDto.question_chart || existingContent.questionChart,
      wordLimit: updateDto.word_limit || existingContent.wordLimit,
      keywords: updateDto.keywords || existingContent.keywords,
      sampleAnswers: updateDto.sample_answers || existingContent.sampleAnswers,
    };

    const exercise = await this.prisma.prisma.exercises.update({
      where: { id },
      data: {
        title: updateDto.title,
        instruction: updateDto.instruction,
        content: updatedContent as unknown as Prisma.JsonObject,
        time_limit: updateDto.time_limit,
        passing_score: updateDto.passing_score,
        ordering: updateDto.ordering,
        updated_at: new Date(),
      },
      include: {
        test_sections: {
          include: {
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
        _count: {
          select: {
            questions: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    this.logger.log(`Updated writing exercise: ${id}`);
    return {
      ...exercise,
      writing_content: exercise.content as WritingContent,
    };
  }

  /**
   * Delete Writing Exercise (soft delete) (for mock tests)
   */
  async deleteExerciseForMockTest(id: string): Promise<void> {
    const exercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.WRITING,
        deleted: false,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Writing exercise not found');
    }

    await this.prisma.prisma.exercises.update({
      where: { id },
      data: {
        deleted: true,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Deleted writing exercise: ${id}`);
  }

  /**
   * Get all mock tests with writing sections
   */
  async getMockTestsWithSections() {
    const mockTests = await this.prisma.prisma.mock_tests.findMany({
      where: {
        deleted: false,
        test_sections: {
          some: {
            section_type: SECTION_TYPE.WRITING,
            deleted: false,
          },
        },
      },
      include: {
        test_sections: {
          where: {
            section_type: SECTION_TYPE.WRITING,
            deleted: false,
          },
          include: {
            exercises: {
              where: {
                skill_type: SKILL_TYPE.WRITING,
                deleted: false,
              },
              include: {
                _count: {
                  select: {
                    questions: {
                      where: { deleted: false },
                    },
                  },
                },
              },
              orderBy: { ordering: 'asc' },
            },
          },
          orderBy: { ordering: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return mockTests;
  }
}
