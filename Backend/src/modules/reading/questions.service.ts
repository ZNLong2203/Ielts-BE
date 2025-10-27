// src/modules/reading/questions.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FileType } from 'src/common/constants';
import { QUESTION_TYPE } from 'src/modules/exercises/constants';
import {
  CreateReadingQuestionDto,
  UpdateReadingQuestionDto,
} from 'src/modules/reading/dto/create-reading.dto';
import {
  QuestionWithDetails,
  SKILL_TYPE,
} from 'src/modules/reading/types/reading.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilesService } from '../files/files.service';

interface QuestionDetails {
  id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  audio_url?: string;
  reading_passage?: string;
  explanation?: string;
  points: number;
  correct_answer_count: number;
  ordering: number;
  difficulty_level?: number;
  question_group?: string;
  question_options: QuestionOptionDetails[];
  matching_sets?: MatchingSetDetails;
}

interface QuestionOptionDetails {
  id: string;
  option_text: string;
  is_correct: boolean;
  ordering: number;
  point: number;
  explanation?: string;
}

interface MatchingSetDetails {
  id: string;
  title: string;
  matching_options: MatchingOptionDetails[];
}

interface MatchingOptionDetails {
  id: string;
  option_text: string;
  ordering: number;
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * 📝 Create Question for Reading Exercise
   */
  async createQuestion(createDto: CreateReadingQuestionDto) {
    // Validate exercise exists and is reading type
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: createDto.exercise_id,
        skill_type: SKILL_TYPE.READING,
        deleted: false,
      },
      include: {
        test_sections: {
          select: {
            id: true,
            section_name: true,
            mock_tests: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    // Validate ordering uniqueness within exercise
    if (createDto.ordering !== undefined) {
      const existingQuestion = await this.prisma.questions.findFirst({
        where: {
          exercise_id: createDto.exercise_id,
          ordering: createDto.ordering,
          deleted: false,
        },
      });

      if (existingQuestion) {
        throw new ConflictException(
          `Question with ordering ${createDto.ordering} already exists in this exercise`,
        );
      }
    }

    // Validate question type specific requirements
    this.validateQuestionTypeRequirements(createDto);

    return await this.prisma.$transaction(async (tx) => {
      // Handle matching questions
      let matchingSetId = createDto.matching_set_id;
      if (
        createDto.question_type === QUESTION_TYPE.MATCHING &&
        !matchingSetId
      ) {
        matchingSetId = await this.createParagraphMatchingSet(
          tx,
          createDto.question_group || 'Questions',
        );
      }

      // Get next ordering if not provided
      const ordering =
        createDto.ordering ??
        (await this.getNextOrdering(tx, createDto.exercise_id));

      // Create question
      const question = await tx.questions.create({
        data: {
          exercise_id: createDto.exercise_id,
          matching_set_id: matchingSetId,
          question_text: createDto.question_text,
          question_type: createDto.question_type,
          question_group: createDto.question_group,
          correct_answer_count: createDto.correct_answer_count || 1,
          points: createDto.points || 1,
          ordering: ordering,
          difficulty_level: createDto.difficulty_level,
          explanation: createDto.explanation,
        },
        include: {
          exercises: {
            select: {
              id: true,
              title: true,
              skill_type: true,
              test_section_id: true,
              lesson_id: true,
            },
          },
          question_options: {
            where: { deleted: false },
            orderBy: { ordering: 'asc' },
          },
          matching_sets: {
            include: {
              matching_options: {
                where: { deleted: false },
                orderBy: { ordering: 'asc' },
              },
            },
          },
        },
      });

      // Create options for multiple choice questions
      if (createDto.options && createDto.options.length > 0) {
        await this.createQuestionOptions(
          tx,
          question.id,
          createDto.options as QuestionOptionDetails[],
        );
      }

      // Handle fill blank and true/false questions
      if (
        [QUESTION_TYPE.FILL_BLANK, QUESTION_TYPE.TRUE_FALSE].includes(
          createDto.question_type,
        )
      ) {
        await this.createCorrectAnswerOptions(
          tx,
          question.id,
          createDto.correct_answer,
          createDto.alternative_answers,
        );
      }

      // Update exercise metadata
      await this.updateExerciseMetadata(tx, createDto.exercise_id);

      this.logger.log(
        `✅ Created question for exercise: ${createDto.exercise_id}`,
      );

      // Refetch question with all includes
      return await tx.questions.findUniqueOrThrow({
        where: { id: question.id },
        include: {
          exercises: {
            select: {
              id: true,
              title: true,
              skill_type: true,
              test_section_id: true,
              lesson_id: true,
            },
          },
          question_options: {
            where: { deleted: false },
            orderBy: { ordering: 'asc' },
          },
          matching_sets: {
            include: {
              matching_options: {
                where: { deleted: false },
                orderBy: { ordering: 'asc' },
              },
            },
          },
        },
      });
    });
  }

  /**
   * 📖 Get Questions by Exercise ID
   */
  async getQuestionsByExercise(exerciseId: string) {
    // Validate exercise exists
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        skill_type: SKILL_TYPE.READING,
        deleted: false,
      },
      select: {
        id: true,
        title: true,
        skill_type: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    const questionsData = await this.prisma.questions.findMany({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      include: {
        question_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
        matching_sets: {
          include: {
            matching_options: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
            },
          },
        },
      },
      orderBy: { ordering: 'asc' },
    });

    const questions: QuestionDetails[] = questionsData.map((question) =>
      this.mapQuestionToDetails(question as unknown as QuestionDetails),
    );

    return {
      questions,
      total_questions: questions.length,
      exercise_info: exercise,
    };
  }

  /**
   * 🔍 Get Question by ID
   */
  async getQuestionById(id: string): Promise<QuestionWithDetails> {
    const question = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            id: true,
            title: true,
            skill_type: true,
            test_sections: {
              select: {
                id: true,
                section_name: true,
                mock_tests: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
            lessons: {
              select: {
                id: true,
                title: true,
                sections: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        question_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
        matching_sets: {
          include: {
            matching_options: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
            },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.mapQuestionToDetails(question as unknown as QuestionDetails);
  }

  /**
   * ✏️ Update Question
   */
  async updateQuestion(
    id: string,
    updateDto: UpdateReadingQuestionDto,
  ): Promise<QuestionWithDetails> {
    const existingQuestion = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            id: true,
            skill_type: true,
          },
        },
      },
    });

    if (!existingQuestion) {
      throw new NotFoundException('Question not found');
    }

    if (existingQuestion?.exercises?.skill_type !== SKILL_TYPE.READING) {
      throw new BadRequestException('Can only update reading questions');
    }

    // Validate ordering uniqueness if being updated
    if (
      updateDto.ordering !== undefined &&
      updateDto.ordering !== existingQuestion.ordering
    ) {
      const conflictingQuestion = await this.prisma.questions.findFirst({
        where: {
          exercise_id: existingQuestion.exercise_id,
          ordering: updateDto.ordering,
          deleted: false,
          id: { not: id },
        },
      });

      if (conflictingQuestion) {
        throw new ConflictException(
          `Question with ordering ${updateDto.ordering} already exists in this exercise`,
        );
      }
    }

    // Validate question type requirements if type is being changed
    if (
      updateDto.question_type &&
      updateDto.question_type !== existingQuestion.question_type
    ) {
      this.validateQuestionTypeRequirements({
        ...updateDto,
        exercise_id: existingQuestion.exercise_id,
        question_text:
          updateDto.question_text || existingQuestion.question_text,
        question_type: updateDto.question_type,
      } as CreateReadingQuestionDto);
    }

    return await this.prisma.$transaction(async (tx) => {
      if (!existingQuestion.exercise_id) {
        throw new BadRequestException('Question is not linked to any exercise');
      }
      // Update question
      const updatedQuestion = await tx.questions.update({
        where: { id },
        data: {
          question_text: updateDto.question_text,
          question_type: updateDto.question_type,
          question_group: updateDto.question_group,
          correct_answer_count: updateDto.correct_answer_count,
          points: updateDto.points,
          ordering: updateDto.ordering,
          difficulty_level: updateDto.difficulty_level,
          explanation: updateDto.explanation,
          matching_set_id: updateDto.matching_set_id,
          updated_at: new Date(),
        },
      });

      // Update options if provided
      if (updateDto.options && updateDto.options.length > 0) {
        // Delete existing options
        await tx.question_options.updateMany({
          where: { question_id: id },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });

        // Create new options
        await this.createQuestionOptions(
          tx,
          id,
          updateDto.options as QuestionOptionDetails[],
        );
      }

      // Handle correct answer updates for fill_blank and true_false
      if (updateDto.correct_answer !== undefined) {
        await tx.question_options.updateMany({
          where: { question_id: id },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });

        await this.createCorrectAnswerOptions(
          tx,
          id,
          updateDto.correct_answer,
          updateDto.alternative_answers,
        );
      }

      // Update exercise metadata
      await this.updateExerciseMetadata(tx, existingQuestion.exercise_id);

      this.logger.log(`✅ Updated question: ${id}`);

      // Return updated question with all includes
      const questionWithIncludes = await tx.questions.findUniqueOrThrow({
        where: { id },
        include: {
          question_options: {
            where: { deleted: false },
            orderBy: { ordering: 'asc' },
          },
          matching_sets: {
            include: {
              matching_options: {
                where: { deleted: false },
                orderBy: { ordering: 'asc' },
              },
            },
          },
        },
      });

      return this.mapQuestionToDetails(
        questionWithIncludes as unknown as QuestionDetails,
      );
    });
  }

  /**
   * 🗑️ Delete Question (soft delete)
   */
  async deleteQuestion(id: string): Promise<void> {
    const question = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            id: true,
            skill_type: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question?.exercises?.skill_type !== SKILL_TYPE.READING) {
      throw new BadRequestException('Can only delete reading questions');
    }

    await this.prisma.$transaction(async (tx) => {
      if (!question.exercise_id) {
        throw new BadRequestException('Question is not linked to any exercise');
      }
      // Soft delete question options
      await tx.question_options.updateMany({
        where: { question_id: id },
        data: {
          deleted: true,
          updated_at: new Date(),
        },
      });

      // Soft delete question
      await tx.questions.update({
        where: { id },
        data: {
          deleted: true,
          updated_at: new Date(),
        },
      });

      // Update exercise metadata
      await this.updateExerciseMetadata(tx, question.exercise_id);
    });

    this.logger.log(`✅ Deleted question: ${id}`);
  }

  /**
   * 🖼️ Upload Image for Question
   */
  async uploadQuestionImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<QuestionWithDetails> {
    const question = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            skill_type: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question?.exercises?.skill_type !== SKILL_TYPE.READING) {
      throw new BadRequestException(
        'Can only upload images for reading questions',
      );
    }

    try {
      const uploadResult = await this.filesService.uploadFile(
        file.buffer,
        file.originalname,
        FileType.EXERCISE_IMAGE,
      );

      // Delete old image if exists
      if (question.image_url) {
        try {
          await this.filesService.deleteFiles([question.image_url]);
        } catch (error) {
          this.logger.warn(`Failed to delete old image: ${question.image_url}`);
        }
      }

      const updatedQuestion = await this.prisma.questions.update({
        where: { id },
        data: {
          image_url: uploadResult.url,
          updated_at: new Date(),
        },
        include: {
          question_options: {
            where: { deleted: false },
            orderBy: { ordering: 'asc' },
          },
          matching_sets: {
            include: {
              matching_options: {
                where: { deleted: false },
                orderBy: { ordering: 'asc' },
              },
            },
          },
        },
      });

      this.logger.log(`✅ Uploaded image for question: ${id}`);
      return this.mapQuestionToDetails(
        updatedQuestion as unknown as QuestionDetails,
      );
    } catch (error) {
      this.logger.error('Error uploading question image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * 🔄 Reorder Questions in Exercise
   */
  async reorderQuestions(
    exerciseId: string,
    questionOrders: Array<{ id: string; ordering: number }>,
  ): Promise<void> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        skill_type: SKILL_TYPE.READING,
        deleted: false,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    // Validate all questions belong to this exercise
    const questionIds = questionOrders.map((q) => q.id);
    const questions = await this.prisma.questions.findMany({
      where: {
        id: { in: questionIds },
        exercise_id: exerciseId,
        deleted: false,
      },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException(
        'Some questions do not belong to this exercise',
      );
    }

    // Check for duplicate ordering values
    const orderings = questionOrders.map((q) => q.ordering);
    if (new Set(orderings).size !== orderings.length) {
      throw new BadRequestException(
        'Duplicate ordering values are not allowed',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const { id, ordering } of questionOrders) {
        await tx.questions.update({
          where: { id },
          data: {
            ordering,
            updated_at: new Date(),
          },
        });
      }
    });

    this.logger.log(
      `✅ Reordered ${questionOrders.length} questions in exercise: ${exerciseId}`,
    );
  }

  // ======= PRIVATE HELPER METHODS =======

  private async validateQuestionTypeRequirements(
    dto: CreateReadingQuestionDto,
  ): Promise<void> {
    switch (dto.question_type) {
      case QUESTION_TYPE.MULTIPLE_CHOICE: {
        if (!dto.options || dto.options.length < 2) {
          throw new BadRequestException(
            'Multiple choice questions must have at least 2 options',
          );
        }
        const correctOptions = dto.options.filter((opt) => opt.is_correct);
        if (
          dto.question_type === QUESTION_TYPE.MULTIPLE_CHOICE &&
          correctOptions.length !== 1
        ) {
          throw new BadRequestException(
            'Single choice questions must have exactly 1 correct option',
          );
        }
        if (
          dto.question_type === QUESTION_TYPE.MULTIPLE_CHOICE &&
          correctOptions.length < 1
        ) {
          throw new BadRequestException(
            'Multiple choice questions must have at least 1 correct option',
          );
        }
        break;
      }

      case QUESTION_TYPE.TRUE_FALSE:
        if (
          !dto.correct_answer ||
          !['true', 'false'].includes(dto.correct_answer.toLowerCase())
        ) {
          throw new BadRequestException(
            'True/False questions must have correct_answer as "true" or "false"',
          );
        }
        break;

      case QUESTION_TYPE.FILL_BLANK:
        if (!dto.correct_answer || dto.correct_answer.trim().length === 0) {
          throw new BadRequestException(
            'Fill blank questions must have a correct_answer',
          );
        }
        break;

      case QUESTION_TYPE.MATCHING:
        // Matching questions can optionally have a matching_set_id
        if (dto.matching_set_id) {
          const matchingSet = await this.prisma.matching_sets.findUnique({
            where: { id: dto.matching_set_id, deleted: false },
          });
          if (!matchingSet) {
            throw new BadRequestException('Invalid matching_set_id');
          }
        }
        break;

      default:
        // Other question types are valid
        break;
    }
  }

  private async createParagraphMatchingSet(
    tx: Prisma.TransactionClient,
    groupName: string,
  ): Promise<string> {
    const matchingSet = await tx.matching_sets.create({
      data: {
        title: `Paragraph Matching - ${groupName}`,
      },
    });

    // Create A, B, C, D, E options
    const paragraphLabels = ['A', 'B', 'C', 'D', 'E'];
    for (const [index, label] of paragraphLabels.entries()) {
      await tx.matching_options.create({
        data: {
          set_id: matchingSet.id,
          option_text: label,
          ordering: index + 1,
        },
      });
    }

    return matchingSet.id;
  }

  private async getNextOrdering(
    tx: Prisma.TransactionClient,
    exerciseId: string,
  ): Promise<number> {
    const lastQuestion = await tx.questions.findFirst({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      orderBy: { ordering: 'desc' },
    });

    return (lastQuestion?.ordering || 0) + 1;
  }

  private async createQuestionOptions(
    tx: Prisma.TransactionClient,
    questionId: string,
    options: QuestionOptionDetails[],
  ): Promise<void> {
    for (const [index, optionDto] of options.entries()) {
      await tx.question_options.create({
        data: {
          question_id: questionId,
          option_text: optionDto.option_text,
          is_correct: optionDto.is_correct || false,
          ordering: optionDto.ordering ?? index + 1,
          point: optionDto.point || 1,
          explanation: optionDto.explanation,
        },
      });
    }
  }

  private async createCorrectAnswerOptions(
    tx: Prisma.TransactionClient,
    questionId: string,
    correctAnswer?: string,
    alternativeAnswers?: string[],
  ): Promise<void> {
    if (correctAnswer) {
      await tx.question_options.create({
        data: {
          question_id: questionId,
          option_text: correctAnswer,
          is_correct: true,
          ordering: 1,
        },
      });

      // Add alternative answers
      if (alternativeAnswers && alternativeAnswers.length > 0) {
        for (const [index, altAnswer] of alternativeAnswers.entries()) {
          await tx.question_options.create({
            data: {
              question_id: questionId,
              option_text: altAnswer,
              is_correct: true,
              ordering: index + 2,
            },
          });
        }
      }
    }
  }

  private async updateExerciseMetadata(
    tx: Prisma.TransactionClient,
    exerciseId: string,
  ): Promise<void> {
    // Get current question count and types
    const questionsData = await tx.questions.findMany({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      select: {
        question_type: true,
      },
    });

    const questionTypes = [
      ...new Set(questionsData.map((q) => q.question_type)),
    ];

    // Get current exercise content
    const exercise = await tx.exercises.findUniqueOrThrow({
      where: { id: exerciseId },
      select: { content: true },
    });

    const existingContent = exercise.content as any;

    await tx.exercises.update({
      where: { id: exerciseId },
      data: {
        content: {
          ...existingContent,
          exercise_metadata: {
            ...existingContent.exercise_metadata,
            total_questions: questionsData.length,
            question_types: questionTypes,
            updated_at: new Date(),
          },
        },
        updated_at: new Date(),
      },
    });
  }

  private mapQuestionToDetails(question: QuestionDetails): QuestionWithDetails {
    return {
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      image_url: question.image_url || undefined,
      audio_url: question.audio_url || undefined,
      reading_passage: question.reading_passage || undefined,
      explanation: question.explanation || undefined,
      points: Number(question.points),
      correct_answer_count: question.correct_answer_count,
      ordering: question.ordering,
      difficulty_level: question.difficulty_level
        ? Number(question.difficulty_level)
        : undefined,
      question_group: question.question_group || undefined,
      question_options:
        question.question_options?.map((option: QuestionOptionDetails) => ({
          id: option.id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          ordering: option.ordering,
          point: Number(option.point),
          explanation: option.explanation || undefined,
        })) || [],
      matching_sets: question.matching_sets
        ? {
            id: question.matching_sets.id,
            title: question.matching_sets.title || '',
            matching_options:
              question.matching_sets.matching_options?.map(
                (option: MatchingOptionDetails) => ({
                  id: option.id,
                  option_text: option.option_text,
                  ordering: option.ordering,
                }),
              ) || [],
          }
        : undefined,
    };
  }
}
