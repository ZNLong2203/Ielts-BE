import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { FileType } from 'src/common/constants';
import {
  CreateExerciseDto,
  CreateQuestionDto,
} from 'src/modules/exercises/dto/create-exercise.dto';
import { UpdateExerciseDto } from 'src/modules/exercises/dto/update-exercise.dto';
import { FilesService } from 'src/modules/files/files.service';
import { VideoService } from 'src/modules/video/video.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUESTION_TYPE } from './constants';

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
  image_url: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  reading_passage: string | null;
  explanation: string | null;
  points: Decimal | null;
  ordering: number | null;
  difficulty_level: Decimal | null;
  question_group: string | null;
  deleted: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  options?: QuestionOption[];
  // Additional parsed fields from explanation JSON
  correct_answer?: string;
  alternative_answers?: string[];
  content?: string;
}

// Fix max_attempts type to match database schema
export interface Exercise {
  id: string;
  lesson_id: string | null;
  title: string;
  instruction: string | null;
  content: any;
  time_limit: number | null;
  max_attempts: number | null; // Changed from number to number | null
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

// Export response types for controller
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService,
    private readonly videoService: VideoService,
  ) {}

  /**
   * Create exercise with questions
   */
  async createExercise(
    createDto: CreateExerciseDto,
    lessonId: string,
  ): Promise<Exercise> {
    // Validate lesson exists
    const lesson = await this.prisma.lessons.findFirst({
      where: { id: lessonId, deleted: false },
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
          },
          time_limit: createDto.time_limit || 30,
          max_attempts: createDto.max_attempts || 3,
          passing_score: createDto.passing_score || 70,
          ordering: createDto.ordering || 0,
          is_active: createDto.is_active ?? true,
        },
      });

      this.logger.log(`Created exercise: ${exercise.title}`);

      // Type-safe return with proper type casting
      return {
        ...exercise,
      } as Exercise;
    });
  }

  /**
   * Create question by exercise ID
   */
  async createQuestion(
    exerciseId: string,
    createQuestionDto: CreateQuestionDto,
  ): Promise<Question> {
    // Validate exercise exists
    const exercise = await this.prisma.exercises.findFirst({
      where: { id: exerciseId, deleted: false },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Create question with transaction
    return await this.prisma.$transaction(async (tx) => {
      // Determine if media_url is image or audio
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;

      if (createQuestionDto.image_url) {
        imageUrl = createQuestionDto.image_url;
      } else if (createQuestionDto.audio_url) {
        audioUrl = createQuestionDto.audio_url;
      }

      // Create questions with proper typing
      const question = await tx.questions.create({
        data: {
          exercise_id: exercise.id,
          question_text: createQuestionDto.question_text,
          question_type: createQuestionDto.question_type,
          image_url: imageUrl,
          audio_url: audioUrl,
          reading_passage: createQuestionDto.reading_passage,
          explanation: createQuestionDto.explanation,
          points: createQuestionDto.points || 1,
          ordering: createQuestionDto.ordering || 0,
          difficulty_level: createQuestionDto.difficulty_level || 5,
          question_group: createQuestionDto.question_group,
        },
      });

      // Handle different question types
      if (this.requiresOptions(createQuestionDto.question_type)) {
        if (
          !createQuestionDto.options ||
          createQuestionDto.options.length === 0
        ) {
          throw new BadRequestException(
            `Options are required for ${createQuestionDto.question_type} questions`,
          );
        }

        const options: QuestionOption[] = [];
        for (const optionDto of createQuestionDto.options) {
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
      } else if (this.requiresCorrectAnswer(createQuestionDto.question_type)) {
        // Store correct answers for fill_blank, true_false
        const answerData = {
          correct_answer: createQuestionDto.correct_answer,
          alternative_answers: createQuestionDto.alternative_answers || [],
          content: createQuestionDto.content,
          original_explanation: createQuestionDto.explanation,
        };

        await tx.questions.update({
          where: { id: question.id },
          data: {
            explanation: JSON.stringify(answerData),
          },
        });
      } else if (createQuestionDto.question_type === QUESTION_TYPE.ESSAY) {
        // Handle essay questions
        const essayData = {
          content: createQuestionDto.content,
          word_limit: createQuestionDto.content
            ? parseInt(createQuestionDto.content)
            : null,
          grading_criteria: [
            'content',
            'organization',
            'grammar',
            'vocabulary',
          ],
          original_explanation: createQuestionDto.explanation,
        };

        await tx.questions.update({
          where: { id: question.id },
          data: {
            explanation: JSON.stringify(essayData),
          },
        });
      }

      // update exercise_metadata
      const existingContent = exercise.content as any;
      const existingMetadata =
        existingContent?.exercise_metadata as ExerciseMetadata;

      await tx.exercises.update({
        where: { id: exercise.id },
        data: {
          content: {
            exercise_metadata: {
              ...existingMetadata,
              total_questions: (existingMetadata?.total_questions || 0) + 1,
              updated_at: new Date(),
            },
          },
        },
      });

      // Type-safe return
      return {
        ...question,
      } as Question;
    });
  }

  /**
   * Get all exercises by lesson id
   */
  async getExercisesByLessonId(lessonId: string): Promise<Exercise[]> {
    return await this.prisma.exercises.findMany({
      where: {
        lesson_id: lessonId,
        deleted: false,
      },
    });
  }

  /**
   * Get exercise by ID
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
        question_groups: {
          where: { deleted: false },
          include: {
            matching_options: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
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
          orderBy: { ordering: 'asc' },
        },
        questions: {
          where: {
            deleted: false,
            question_group_id: null,
          },
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

    // Process question groups with async audio URL conversion
    const questionGroups = await Promise.all(
      exercise.question_groups.map(async (group) => {
        const questions = await Promise.all(
          group.questions.map(async (question) => {
            // Check audio URLs
            let audioUrl = question.audio_url;
            if (audioUrl) {
              audioUrl = await this.videoService.getVideoHLSUrl(audioUrl);
            }

            return {
              ...question,
              audio_url: audioUrl,
              question_options: question.question_options,
              // Parse stored answer data
              ...(this.requiresCorrectAnswer(question.question_type) &&
              question.explanation
                ? this.parseAnswerData(question.explanation)
                : {}),
            };
          }),
        );

        return {
          id: group.id,
          exercise_id: group.exercise_id,
          image_url: group.image_url,
          group_title: group.group_title,
          group_instruction: group.group_instruction,
          passage_reference: group.passage_reference,
          question_type: group.question_type,
          ordering: group.ordering,
          question_range: group.question_range,
          correct_answer_count: group.correct_answer_count,
          matching_options: group.matching_options,
          questions,
        };
      }),
    );

    // Process ungrouped questions with async audio URL conversion
    const questions = await Promise.all(
      exercise.questions.map(async (question) => {
        // Check audio URLs
        let audioUrl = question.audio_url;
        if (audioUrl) {
          audioUrl = await this.videoService.getVideoHLSUrl(audioUrl);
        }

        return {
          ...question,
          audio_url: audioUrl,
          question_options: question.question_options,
          // Parse stored answer data
          ...(this.requiresCorrectAnswer(question.question_type) &&
          question.explanation
            ? this.parseAnswerData(question.explanation)
            : {}),
        };
      }),
    );

    // Process exercise audio URL
    const content = exercise.content as any;
    let audioUrl = content?.media_url;
    if (audioUrl && (audioUrl.includes('.mp3') || audioUrl.includes('.wav'))) {
      audioUrl = await this.videoService.getVideoHLSUrl(audioUrl);
    }

    return {
      ...exercise,
      audio_url: audioUrl,
      skill_type: exercise.skill_type,
      question_groups: questionGroups,
      questions,
    };
  }

  /**
   * Update exercise
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
      // Type-safe content handling
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

      return exercise as Exercise;
    });
  }

  /**
   * Update question by ID
   */
  async updateQuestion(
    questionId: string,
    updateDto: CreateQuestionDto,
  ): Promise<Question> {
    const existingQuestion = await this.prisma.questions.findFirst({
      where: { id: questionId, deleted: false },
    });

    if (!existingQuestion) {
      throw new NotFoundException('Question not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Determine if media_url is image or audio
      let imageUrl: string | undefined = undefined;
      let audioUrl: string | undefined = undefined;

      if (updateDto.image_url) {
        imageUrl = updateDto.image_url;
      }
      if (updateDto.audio_url) {
        audioUrl = updateDto.audio_url;
      }

      // Update question
      const question = await tx.questions.update({
        where: { id: questionId },
        data: {
          question_text: updateDto.question_text,
          question_type: updateDto.question_type,
          image_url: imageUrl,
          audio_url: audioUrl,
          reading_passage: updateDto.reading_passage,
          explanation: updateDto.explanation,
          points: updateDto.points || 1,
          ordering: updateDto.ordering || 0,
          difficulty_level: updateDto.difficulty_level || 5,
          question_group: updateDto.question_group,
        },
      });

      // Handle different question types
      if (this.requiresOptions(updateDto.question_type)) {
        // Delete existing options
        await tx.question_options.updateMany({
          where: { question_id: questionId },
          data: { deleted: true },
        });

        // Create new options
        for (const optionDto of updateDto.options || []) {
          await tx.question_options.create({
            data: {
              question_id: question.id,
              option_text: optionDto.option_text,
              is_correct: optionDto.is_correct || false,
              ordering: optionDto.ordering || 0,
              explanation: optionDto.explanation,
            },
          });
        }
      } else if (this.requiresCorrectAnswer(updateDto.question_type)) {
        // Store correct answers for fill_blank, true_false
        const answerData = {
          correct_answer: updateDto.correct_answer,
          alternative_answers: updateDto.alternative_answers || [],
          content: updateDto.content,
          original_explanation: updateDto.explanation,
        };

        await tx.questions.update({
          where: { id: question.id },
          data: {
            explanation: JSON.stringify(answerData),
          },
        });
      } else if (updateDto.question_type === QUESTION_TYPE.ESSAY) {
        // Handle essay questions
        const essayData = {
          content: updateDto.content,
          word_limit: updateDto.content ? parseInt(updateDto.content) : null,
          grading_criteria: [
            'content',
            'organization',
            'grammar',
            'vocabulary',
          ],
          original_explanation: updateDto.explanation,
        };

        await tx.questions.update({
          where: { id: question.id },
          data: {
            explanation: JSON.stringify(essayData),
          },
        });
      }

      // Update exercise metadata
      if (!question.exercise_id)
        throw new NotFoundException('Associated exercise not found');
      const exercise = await tx.exercises.findFirst({
        where: { id: question.exercise_id },
      });

      if (exercise) {
        const existingContent = exercise.content as any;
        const existingMetadata =
          existingContent?.exercise_metadata as ExerciseMetadata;

        await tx.exercises.update({
          where: { id: exercise.id },
          data: {
            content: {
              exercise_metadata: {
                ...existingMetadata,
                updated_at: new Date(),
              },
            },
          },
        });
      }

      // Type-safe return

      return {
        ...question,
      } as Question;
    });
  }

  /**
   * Delete question by ID
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const question = await this.prisma.questions.findFirst({
      where: { id: questionId, deleted: false },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete options
      await tx.question_options.updateMany({
        where: { question_id: questionId },
        data: { deleted: true },
      });

      // Soft delete question
      await tx.questions.update({
        where: { id: questionId },
        data: { deleted: true },
      });

      // Update exercise metadata
      if (!question.exercise_id) {
        throw new NotFoundException('Associated exercise not found');
      }
      const exercise = await tx.exercises.findFirst({
        where: { id: question.exercise_id },
      });

      if (exercise) {
        const existingContent = exercise.content as any;
        const existingMetadata =
          existingContent?.exercise_metadata as ExerciseMetadata;

        await tx.exercises.update({
          where: { id: exercise.id },
          data: {
            content: {
              exercise_metadata: {
                ...existingMetadata,
                total_questions: (existingMetadata?.total_questions || 1) - 1,
                updated_at: new Date(),
              },
            },
          },
        });
      }
    });

    this.logger.log(`Deleted question: ${questionId}`);
  }

  /**
   * Delete exercise
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

    this.logger.log(`Deleted exercise: ${exerciseId}`);
  }

  /**
   * Get exercise statistics
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
      // Fix Decimal type issues
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
          // Handle null difficulty_level
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
   * Get
   */

  /**
   * Upload image for question
   */
  async uploadQuestionImage(id: string, file: Express.Multer.File) {
    try {
      const question = await this.prisma.questions.findFirst({
        where: { id, deleted: false },
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const uploadResult = await this.fileService.uploadFile(
        file.buffer,
        file.originalname,
        FileType.EXERCISE_IMAGE,
      );

      // Delete previous image if exists
      if (question.image_url) {
        await this.fileService.deleteFiles(question.image_url);
      }

      return await this.prisma.questions.update({
        where: { id },
        data: {
          image_url: uploadResult.url,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error uploading question image', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Upload audio for question
   */
  async uploadQuestionAudio(id: string, file: Express.Multer.File) {
    try {
      const question = await this.prisma.questions.findFirst({
        where: { id, deleted: false },
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const uploadResult = await this.videoService.uploadVideo(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      // Delete previous audio if exists
      if (question.audio_url) {
        await this.videoService.clearVideoData(question.audio_url);
      }

      return await this.prisma.questions.update({
        where: { id },
        data: {
          audio_url: uploadResult.fileName,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error uploading question audio', error);
      throw new BadRequestException('Failed to upload audio');
    }
  }

  /**
   * Helper methods
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
        explanation: data.explanation || data.original_explanation,
      };
    } catch {
      return { explanation };
    }
  }

  /**
   * Submit exercise answers and grade them
   */
  async submitExercise(
    exerciseId: string,
    userId: string,
    answers: Record<string, string | string[] | null>,
    timeTaken?: number,
  ) {
    // Get exercise metadata
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        deleted: false,
      },
    });
    
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Check max attempts
    const existingSubmissions = await this.prisma.user_submissions.count({
      where: {
        exercise_id: exerciseId,
        user_id: userId,
        deleted: false,
      },
    });

    const maxAttempts = exercise.max_attempts || 1;
    if (existingSubmissions >= maxAttempts) {
      throw new BadRequestException(
        `Maximum attempts (${maxAttempts}) exceeded for this exercise`,
      );
    }

    // Get questions directly from DB with all fields including explanation
    const questions = await this.prisma.questions.findMany({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      include: {
        question_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
      orderBy: { ordering: 'asc' },
    });
    this.logger.log(
      `Submitting exercise ${exerciseId} with ${questions.length} questions. Answers: ${JSON.stringify(answers)}`,
    );

    const questionResults: Record<string, boolean> = {};
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    // Grade each question
    for (const question of questions) {
      const userAnswer = answers[question.id];
      let isCorrect = false;
      const points = Number(question.points) || 1;

      this.logger.log(
        `Grading question ${question.id} (type: ${question.question_type}), userAnswer: ${JSON.stringify(userAnswer)}`,
      );
      this.logger.log(
        `Question ${question.id} has ${question.question_options?.length || 0} options: ${JSON.stringify(question.question_options?.map((opt) => ({ id: opt.id, text: opt.option_text, is_correct: opt.is_correct })))}`,
      );

      if (
        question.question_type === 'multiple_choice' ||
        question.question_type === 'drop_list'
      ) {
        // For multiple choice and drop_list, check if user selected the correct option
        const correctOption = question.question_options?.find(
          (opt) => opt.is_correct,
        );

        if (correctOption && userAnswer) {
          // Normalize both values to strings and trim whitespace
          const userAnswerStr = String(
            Array.isArray(userAnswer) ? userAnswer[0] : userAnswer,
          ).trim();
          const correctOptionId = String(correctOption.id).trim();

          isCorrect = userAnswerStr === correctOptionId;

          this.logger.log(
            `Question ${question.id}: Comparing userAnswerStr="${userAnswerStr}" (type: ${typeof userAnswerStr}, length: ${userAnswerStr.length}) with correctOption.id="${correctOptionId}" (type: ${typeof correctOptionId}, length: ${correctOptionId.length}) => isCorrect=${isCorrect}`,
          );

          // Additional debug: check if they're equal after normalization
          if (!isCorrect) {
            this.logger.warn(
              `Question ${question.id}: Answer mismatch! User selected "${userAnswerStr}" but correct is "${correctOptionId}"`,
            );
          }
        } else {
          this.logger.warn(
            `Question ${question.id}: Missing correctOption or userAnswer. correctOption=${!!correctOption}, userAnswer=${!!userAnswer}`,
          );
        }
      } else if (question.question_type === 'fill_blank') {
        // For fill_blank, check against correct_answer
        const answerData = this.parseAnswerData(question.explanation || '{}');
        const correctAnswer = answerData.correct_answer || '';
        const alternativeAnswers = answerData.alternative_answers || [];

        this.logger.log(
          `Fill blank question ${question.id}: correctAnswer="${correctAnswer}", alternativeAnswers=${JSON.stringify(alternativeAnswers)}`,
        );

        if (userAnswer) {
          const userAnswerStr = String(
            Array.isArray(userAnswer) ? userAnswer.join(' ') : userAnswer,
          ).trim();
          const normalizedUserAnswer = userAnswerStr.toLowerCase();
          const normalizedCorrect = correctAnswer.toLowerCase().trim();

          isCorrect = normalizedUserAnswer === normalizedCorrect;

          this.logger.log(
            `Fill blank ${question.id}: Comparing "${normalizedUserAnswer}" with "${normalizedCorrect}" => ${isCorrect}`,
          );

          // Check alternative answers if main answer doesn't match
          if (!isCorrect && alternativeAnswers.length > 0) {
            isCorrect = alternativeAnswers.some(
              (alt: string) =>
                normalizedUserAnswer === alt.toLowerCase().trim(),
            );
            this.logger.log(
              `Fill blank ${question.id}: After checking alternatives => ${isCorrect}`,
            );
          }
        } else {
          this.logger.warn(
            `Fill blank question ${question.id}: No user answer provided`,
          );
        }
      }

      questionResults[question.id] = isCorrect;
      totalPoints += points;
      if (isCorrect) {
        correctCount++;
        earnedPoints += points;
      }

      this.logger.log(
        `Question ${question.id} final result: isCorrect=${isCorrect}, questionResults[${question.id}]=${questionResults[question.id]}`,
      );
    }

    this.logger.log(
      `Final grading summary: correctCount=${correctCount}, totalQuestions=${questions.length}`,
    );
    this.logger.log(`questionResults object:`, questionResults);
    
    // Log each question result
    Object.entries(questionResults).forEach(([qId, isCorrect]) => {
      this.logger.log(`  - Question ${qId}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
    });

    // Calculate score percentage
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Save submission
    const submission = await this.prisma.$transaction(async (tx) => {
      // Create user_submission
      const userSubmission = await tx.user_submissions.create({
        data: {
          user_id: userId,
          exercise_id: exerciseId,
          attempt_number: existingSubmissions + 1,
          answers: answers as any,
          score: new Decimal(score.toFixed(2)),
          max_score: new Decimal(100),
          time_taken: timeTaken || null,
          status: 'graded',
          graded_at: new Date(),
        },
      });

      // Create question_answers for each question
      for (const question of questions) {
        const userAnswer = answers[question.id];
        const isCorrect = questionResults[question.id];
        const points = Number(question.points) || 1;

        // Determine selected_options based on question type
        // Only multiple_choice and drop_list use option IDs (UUIDs)
        // fill_blank uses text, so selected_options should be empty
        let selectedOptions: string[] = [];
        let answerText: string | null = null;

        if (
          question.question_type === 'multiple_choice' ||
          question.question_type === 'drop_list'
        ) {
          // For these types, userAnswer is option ID(s) - UUIDs
          if (Array.isArray(userAnswer)) {
            selectedOptions = userAnswer.filter(
              (id) => id && typeof id === 'string',
            );
          } else if (userAnswer && typeof userAnswer === 'string') {
            // Check if it's a valid UUID format (basic check)
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(userAnswer)) {
              selectedOptions = [userAnswer];
            }
          }
        } else if (question.question_type === 'fill_blank') {
          // For fill_blank, userAnswer is text, not UUID
          answerText = Array.isArray(userAnswer)
            ? userAnswer.join(' ')
            : userAnswer || null;
        }

        await tx.question_answers.create({
          data: {
            submission_id: userSubmission.id,
            question_id: question.id,
            answer_text:
              answerText ||
              (Array.isArray(userAnswer)
                ? userAnswer.join(', ')
                : userAnswer || null),
            selected_options: selectedOptions,
            is_correct: isCorrect,
            points_earned: new Decimal(isCorrect ? points : 0),
            grading_method: 'auto',
          },
        });
      }

      return userSubmission;
    });

    const result = {
      id: submission.id,
      exerciseId: submission.exercise_id || '',
      userId: submission.user_id || '',
      score: Number(submission.score) || 0,
      maxScore: Number(submission.max_score) || 100,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      questionResults,
      status: submission.status || 'graded',
      createdAt: submission.created_at || new Date(),
    };

    this.logger.log(`Returning submission result: ${JSON.stringify(result)}`);

    return result;
  }

  /**
   * Get user's submission for an exercise
   */
  async getExerciseSubmission(exerciseId: string, userId: string) {
    const submission = await this.prisma.user_submissions.findFirst({
      where: {
        exercise_id: exerciseId,
        user_id: userId,
        deleted: false,
      },
      include: {
        question_answers: {
          where: { deleted: false },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!submission) {
      return null;
    }

    // Get total questions from the exercise itself, not from question_answers
    // (to ensure accuracy even if some question_answers are missing)
    const totalQuestions = await this.prisma.questions.count({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
    });

    this.logger.log(
      `[getExerciseSubmission] exerciseId=${exerciseId}, totalQuestions=${totalQuestions}, question_answers.length=${submission.question_answers.length}`,
    );

    // Build question results from question_answers
    const questionResults: Record<string, boolean> = {};
    submission.question_answers.forEach((qa) => {
      if (qa.question_id) {
        questionResults[qa.question_id] = qa.is_correct || false;
      }
    });

    const result = {
      id: submission.id,
      exerciseId: submission.exercise_id || '',
      userId: submission.user_id || '',
      score: Number(submission.score) || 0,
      maxScore: Number(submission.max_score) || 100,
      correctAnswers: submission.question_answers.filter((qa) => qa.is_correct)
        .length,
      totalQuestions, // Use the count from the exercise, not question_answers
      questionResults,
      status: submission.status || 'graded',
      createdAt: submission.created_at || new Date(),
      answers: submission.answers as Record<string, string | string[] | null>,
    };

    this.logger.log(
      `[getExerciseSubmission] Returning: ${JSON.stringify(result)}`,
    );

    return result;
  }
}
