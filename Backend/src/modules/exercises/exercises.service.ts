import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { QUESTION_TYPE } from 'src/modules/exercises/constants';
import { CreateExerciseDto } from 'src/modules/exercises/dto/create-exercise.dto';
import { UpdateExerciseDto } from 'src/modules/exercises/dto/update-exercise.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';

// ✅ Export interfaces to make them available to controller
export interface QuestionOption {
  id: string;
  question_id: string | null;
  option_text: string;
  is_correct: boolean | null;
  ordering: number | null;
  explanation: string | null;
  deleted: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface Question {
  id: string;
  exercise_id: string | null;
  question_text: string;
  question_type: string;
  media_url: string | null;
  explanation: string | null;
  points: Decimal | null;
  ordering: number | null;
  difficulty_level: Decimal | null;
  deleted: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  options?: QuestionOption[];
}

// ✅ Fix max_attempts type to match database schema
export interface Exercise {
  id: string;
  lesson_id: string | null;
  title: string;
  instruction: string | null;
  content: any;
  time_limit: number | null;
  max_attempts: number | null; // ✅ Changed from number to number | null
  passing_score: Decimal | null;
  ordering: number | null;
  is_active: boolean | null;
  deleted: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  questions?: Question[];
}

export interface ExerciseWithIncludes extends Exercise {
  questions: (Question & {
    question_options: QuestionOption[];
  })[];
}

export interface ExerciseMetadata {
  total_questions?: number;
  question_types?: string[];
  created_by?: string;
  updated_by?: string;
  updated_at?: Date;
}

// ✅ Export response types for controller
export interface PaginatedExerciseResponse {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExerciseStats {
  id: string;
  title: string;
  total_questions: number;
  total_points: number;
  question_types: Record<string, number>;
  difficulty_distribution: Record<number, number>;
  time_limit: number | null;
  passing_score: number | null;
  is_active: boolean | null;
}

@Injectable()
export class ExerciseService {
  private readonly logger = new Logger(ExerciseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ✅ Create exercise with questions
   */
  async createExercise(createDto: CreateExerciseDto): Promise<Exercise> {
    // Validate lesson exists
    const lesson = await this.prisma.lessons.findFirst({
      where: { id: createDto.lesson_id, deleted: false },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create exercise
      const exercise = await tx.exercises.create({
        data: {
          lesson_id: createDto.lesson_id,
          title: createDto.title,
          instruction: createDto.instruction,
          content: {
            description: createDto.description,
            main_content: createDto.content,
            media_url: createDto.media_url,
            exercise_metadata: {
              total_questions: createDto.questions.length,
              question_types: [
                ...new Set(createDto.questions.map((q) => q.question_type)),
              ],
            },
          },
          time_limit: createDto.time_limit || 30,
          max_attempts: createDto.max_attempts || 3,
          passing_score: createDto.passing_score || 70,
          ordering: createDto.ordering || 0,
          is_active: createDto.is_active ?? true,
        },
      });

      // ✅ Create questions with proper typing
      const questions: Question[] = [];
      for (const questionDto of createDto.questions) {
        const question = await tx.questions.create({
          data: {
            exercise_id: exercise.id,
            question_text: questionDto.question_text,
            question_type: questionDto.question_type,
            media_url: questionDto.media_url,
            explanation: questionDto.explanation,
            points: questionDto.points || 1,
            ordering: questionDto.ordering || 0,
            difficulty_level: questionDto.difficulty_level || 5,
          },
        });

        // Handle different question types
        if (this.requiresOptions(questionDto.question_type)) {
          if (!questionDto.options || questionDto.options.length === 0) {
            throw new BadRequestException(
              `Options are required for ${questionDto.question_type} questions`,
            );
          }

          const options: QuestionOption[] = [];
          for (const optionDto of questionDto.options) {
            const option = await tx.question_options.create({
              data: {
                question_id: question.id,
                option_text: optionDto.option_text,
                is_correct: optionDto.is_correct || false,
                ordering: optionDto.ordering || 0,
                explanation: optionDto.explanation,
              },
            });
            options.push(option);
          }

          questions.push({ ...question, options });
        } else if (this.requiresCorrectAnswer(questionDto.question_type)) {
          // Store correct answers for fill_blank, true_false
          const answerData = {
            correct_answer: questionDto.correct_answer,
            alternative_answers: questionDto.alternative_answers || [],
            content: questionDto.content,
            original_explanation: questionDto.explanation,
          };

          await tx.questions.update({
            where: { id: question.id },
            data: {
              explanation: JSON.stringify(answerData),
            },
          });

          questions.push(question);
        } else if (questionDto.question_type === QUESTION_TYPE.ESSAY) {
          // Handle essay questions
          const essayData = {
            content: questionDto.content,
            word_limit: questionDto.content
              ? parseInt(questionDto.content)
              : null,
            grading_criteria: [
              'content',
              'organization',
              'grammar',
              'vocabulary',
            ],
            original_explanation: questionDto.explanation,
          };

          await tx.questions.update({
            where: { id: question.id },
            data: {
              explanation: JSON.stringify(essayData),
            },
          });

          questions.push(question);
        } else {
          questions.push(question);
        }
      }

      this.logger.log(
        `✅ Created exercise: ${exercise.title} with ${questions.length} questions`,
      );

      // ✅ Type-safe return with proper type casting
      return {
        ...exercise,
        questions,
      } as Exercise;
    });
  }

  /**
   * 📋 Get all exercises for a lesson
   */
  async getExercisesByLesson(
    lessonId: string,
    query?: PaginationQueryDto,
  ): Promise<PaginatedExerciseResponse> {
    const { page = 1, limit = 10 } = query || {};
    const skip = (page - 1) * limit;

    const [exercises, total] = await Promise.all([
      this.prisma.exercises.findMany({
        where: {
          lesson_id: lessonId,
          deleted: false,
        },
        include: {
          questions: {
            where: { deleted: false },
            include: {
              question_options: {
                where: { deleted: false },
                orderBy: { ordering: 'asc' },
              },
            },
            orderBy: { ordering: 'asc' },
          },
        },
        orderBy: { ordering: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.exercises.count({
        where: {
          lesson_id: lessonId,
          deleted: false,
        },
      }),
    ]);

    const processedExercises = exercises.map((exercise) => ({
      ...exercise,
      questions: exercise.questions.map((question) => ({
        ...question,
        // Parse stored answer data
        ...(this.requiresCorrectAnswer(question.question_type) &&
        question.explanation
          ? this.parseAnswerData(question.explanation)
          : {}),
      })),
    }));

    return {
      data: processedExercises,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 🔍 Get exercise by ID
   */
  async getExerciseById(exerciseId: string): Promise<any> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        deleted: false,
      },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            sections: {
              select: {
                id: true,
                title: true,
                courses: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        questions: {
          where: { deleted: false },
          include: {
            question_options: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
            },
          },
          orderBy: { ordering: 'asc' },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return {
      ...exercise,
      questions: exercise.questions.map((question) => ({
        ...question,
        // Parse stored answer data
        ...(this.requiresCorrectAnswer(question.question_type) &&
        question.explanation
          ? this.parseAnswerData(question.explanation)
          : {}),
      })),
    };
  }

  /**
   * ✏️ Update exercise
   */
  async updateExercise(
    exerciseId: string,
    updateDto: UpdateExerciseDto,
  ): Promise<Exercise> {
    const existingExercise = await this.prisma.exercises.findFirst({
      where: { id: exerciseId, deleted: false },
    });

    if (!existingExercise) {
      throw new NotFoundException('Exercise not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // ✅ Type-safe content handling
      const existingContent = existingExercise.content as any;
      const existingMetadata =
        existingContent?.exercise_metadata as ExerciseMetadata;

      // Update exercise
      const exercise = await tx.exercises.update({
        where: { id: exerciseId },
        data: {
          title: updateDto.title,
          instruction: updateDto.instruction,
          content: {
            description: updateDto.description,
            main_content: updateDto.content,
            media_url: updateDto.media_url,
            exercise_metadata: {
              ...existingMetadata,
              total_questions:
                updateDto.questions?.length ||
                existingMetadata?.total_questions,
              updated_at: new Date(),
            },
          },
          time_limit: updateDto.time_limit,
          max_attempts: updateDto.max_attempts,
          passing_score: updateDto.passing_score,
          ordering: updateDto.ordering,
          is_active: updateDto.is_active,
        },
      });

      // Update questions if provided
      if (updateDto.questions) {
        // Delete existing questions and options
        await tx.question_options.updateMany({
          where: {
            question_id: {
              in: await tx.questions
                .findMany({
                  where: { exercise_id: exerciseId },
                  select: { id: true },
                })
                .then((questions) => questions.map((q) => q.id)),
            },
          },
          data: { deleted: true },
        });

        await tx.questions.updateMany({
          where: { exercise_id: exerciseId },
          data: { deleted: true },
        });

        // ✅ Create new questions with proper typing
        const questions: Question[] = [];
        for (const questionDto of updateDto.questions) {
          const question = await tx.questions.create({
            data: {
              exercise_id: exerciseId,
              question_text: questionDto.question_text,
              question_type: questionDto.question_type,
              media_url: questionDto.media_url,
              explanation: questionDto.explanation,
              points: questionDto.points || 1,
              ordering: questionDto.ordering || 0,
              difficulty_level: questionDto.difficulty_level || 5,
            },
          });

          // Handle options and answers like in create method
          if (this.requiresOptions(questionDto.question_type)) {
            const options: QuestionOption[] = [];
            for (const optionDto of questionDto.options || []) {
              const option = await tx.question_options.create({
                data: {
                  question_id: question.id,
                  option_text: optionDto.option_text,
                  is_correct: optionDto.is_correct || false,
                  ordering: optionDto.ordering || 0,
                  explanation: optionDto.explanation,
                },
              });
              options.push(option);
            }
            questions.push({ ...question, options });
          } else {
            questions.push(question);
          }
        }

        // ✅ Type-safe return
        return { ...exercise, questions } as Exercise;
      }

      return exercise as Exercise;
    });
  }

  /**
   * 🗑️ Delete exercise
   */
  async deleteExercise(exerciseId: string): Promise<void> {
    const exercise = await this.prisma.exercises.findFirst({
      where: { id: exerciseId, deleted: false },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete questions and options
      const questionIds = await tx.questions
        .findMany({
          where: { exercise_id: exerciseId },
          select: { id: true },
        })
        .then((questions) => questions.map((q) => q.id));

      if (questionIds.length > 0) {
        await tx.question_options.updateMany({
          where: { question_id: { in: questionIds } },
          data: { deleted: true },
        });

        await tx.questions.updateMany({
          where: { exercise_id: exerciseId },
          data: { deleted: true },
        });
      }

      await tx.exercises.update({
        where: { id: exerciseId },
        data: { deleted: true },
      });
    });

    this.logger.log(`✅ Deleted exercise: ${exerciseId}`);
  }

  /**
   * 📊 Get exercise statistics
   */
  async getExerciseStats(exerciseId: string): Promise<ExerciseStats> {
    const exercise = await this.prisma.exercises.findFirst({
      where: { id: exerciseId, deleted: false },
      include: {
        questions: {
          where: { deleted: false },
          include: {
            question_options: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const stats: ExerciseStats = {
      id: exercise.id,
      title: exercise.title,
      total_questions: exercise.questions.length,
      // ✅ Fix Decimal type issues
      total_points: exercise.questions.reduce((sum, q) => {
        const points = q.points ? Number(q.points) : 0;
        return sum + points;
      }, 0),
      question_types: exercise.questions.reduce(
        (acc, q) => {
          acc[q.question_type] = (acc[q.question_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      difficulty_distribution: exercise.questions.reduce(
        (acc, q) => {
          // ✅ Handle null difficulty_level
          const level = q.difficulty_level
            ? Math.floor(Number(q.difficulty_level))
            : 0;
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      ),
      time_limit: exercise.time_limit,
      passing_score: exercise.passing_score
        ? Number(exercise.passing_score)
        : null,
      is_active: exercise.is_active,
    };

    return stats;
  }

  /**
   * Get all exercises types
   */
  getAllExerciseTypes(): string[] {
    // Assuming QUESTION_TYPE is an enum or constant object
    return Object.values(QUESTION_TYPE);
  }

  /**
   * 🔧 Helper methods
   */
  private requiresOptions(questionType: string): boolean {
    return [
      QUESTION_TYPE.MULTIPLE_CHOICE,
      QUESTION_TYPE.DROPLIST,
      QUESTION_TYPE.MATCHING,
    ].includes(questionType);
  }

  private requiresCorrectAnswer(questionType: string): boolean {
    return [QUESTION_TYPE.FILL_BLANK, QUESTION_TYPE.TRUE_FALSE].includes(
      questionType,
    );
  }

  private parseAnswerData(explanation: string): any {
    try {
      const data = JSON.parse(explanation);
      return {
        correct_answer: data.correct_answer,
        alternative_answers: data.alternative_answers,
        content: data.content,
        explanation: data.original_explanation,
      };
    } catch {
      return { explanation };
    }
  }
}
