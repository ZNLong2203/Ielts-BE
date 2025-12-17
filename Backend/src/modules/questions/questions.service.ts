import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { matching_options, Prisma } from '@prisma/client';
import { FileType } from 'src/common/constants';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';
import {
  QuestionDetails,
  QuestionWithDetails,
} from 'src/modules/questions/types/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateQuestionTestDto } from './dto/create-question.dto';
import { UpdateQuestionTestDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  /**
   *  Create Question for Question Group
   */
  async createQuestion(createDto: CreateQuestionTestDto) {
    // Xác thực nhóm câu hỏi tồn tại
    let questionGroup: {
      id: string;
      exercise_id: string | null;
      question_type: string;
    } | null = null;
    if (createDto.question_group_id) {
      questionGroup = await this.prisma.question_groups.findFirst({
        where: {
          id: createDto.question_group_id,
          deleted: false,
        },
        select: {
          id: true,
          exercise_id: true,
          question_type: true,
        },
      });

      if (!questionGroup || !questionGroup.exercise_id) {
        throw new NotFoundException(
          'Question group not found or does not belong to any exercise',
        );
      }

      // Đối với loại MATCHING, câu hỏi phải thuộc một nhóm
      if (
        createDto.question_type === QUESTION_TYPE.MATCHING &&
        questionGroup.question_type !== QUESTION_TYPE.MATCHING
      ) {
        throw new BadRequestException(
          'MATCHING questions must belong to a MATCHING question group',
        );
      }
    } else if (createDto.question_type === QUESTION_TYPE.MATCHING) {
      throw new BadRequestException(
        'MATCHING questions require a question_group_id',
      );
    }

    // Xác thực yêu cầu cụ thể của loại câu hỏi
    this.validateQuestionTypeRequirements(createDto);

    return await this.prisma.$transaction(async (tx) => {
      // Lấy thứ tự tiếp theo nếu không được cung cấp
      const ordering = await this.getNextOrdering(
        tx,
        createDto.question_group_id || '',
      );

      // Tạo câu hỏi
      const question = await tx.questions.create({
        data: {
          exercise_id: questionGroup?.exercise_id || null,
          question_group_id: createDto.question_group_id,
          question_type: createDto.question_type,
          question_text: createDto.question_text,
          reading_passage: createDto.reading_passage,
          ordering: ordering,
          points: createDto.points || 1,
          question_group: createDto.question_group,
          explanation: createDto.explanation,
          image_url: createDto.image_url,
          audio_url: createDto.audio_url,
          audio_duration: createDto.audio_duration,
        },
      });

      // Tạo các tùy chọn câu hỏi nếu được cung cấp
      if (createDto.options && createDto.options.length > 0) {
        await this.createQuestionOptions(
          tx,
          question.id,
          createDto.options,
          question.question_type,
        );
      }

      // Tạo các tùy chọn câu trả lời đúng cho FILL_BLANK
      if (
        createDto.question_type === QUESTION_TYPE.FILL_BLANK ||
        createDto.question_type === QUESTION_TYPE.TRUE_FALSE
      ) {
        await this.createCorrectAnswerOptions(
          tx,
          question.id,
          createDto.correct_answer,
          createDto.alternative_answers,
        );
      }

      // cập nhật correct_answer_count trong nhóm câu hỏi
      if (createDto.question_group_id) {
        const correctAnswersCount = await tx.question_options.count({
          where: {
            questions: {
              question_group_id: createDto.question_group_id,
              deleted: false,
            },
            is_correct: true,
            deleted: false,
          },
        });

        await tx.question_groups.update({
          where: { id: createDto.question_group_id },
          data: { correct_answer_count: correctAnswersCount },
        });
      }

      this.logger.log(
        ` Created question for group: ${question.question_group_id}`,
      );

      // Trả về chi tiết câu hỏi đầy đủ
      return await this.getQuestionById(question.id, tx);
    });
  }

  /**
   *  Get Questions by Exercise ID
   */
  async getQuestionsByExercise(exerciseId: string) {
    // Xác thực bài tập tồn tại
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        deleted: false,
      },
      select: {
        id: true,
        title: true,
        skill_type: true,
        exercise_type: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const questionsData = await this.prisma.questions.findMany({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      include: {
        question_groups: {
          select: {
            id: true,
            image_url: true,
            group_title: true,
            group_instruction: true,
            passage_reference: true,
            question_type: true,
            question_range: true,
            correct_answer_count: true,
            ordering: true,
            matching_options: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
            },
          },
        },
        question_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
      orderBy: { ordering: 'asc' },
    });

    const questions: QuestionWithDetails[] = questionsData.map((question) =>
      this.mapQuestionToDetails(question as unknown as QuestionDetails),
    );

    // Nhóm câu hỏi theo question_group_id nếu chúng tồn tại
    const groupedQuestions: Record<string, QuestionWithDetails[]> = {};
    const ungroupedQuestions: QuestionWithDetails[] = [];

    questions.forEach((q) => {
      if (q.question_group_id) {
        const groupId = q.question_group_id;
        if (!groupedQuestions[groupId]) {
          groupedQuestions[groupId] = [];
        }
        groupedQuestions[groupId].push(q);
      } else {
        ungroupedQuestions.push(q);
      }
    });

    return {
      questions,
      grouped_questions: groupedQuestions,
      ungrouped_questions: ungroupedQuestions,
      total_questions: questions.length,
      total_points: questions.reduce((sum, q) => sum + Number(q.points), 0),
      exercise_info: exercise,
    };
  }

  /**
   *  Get Question by ID
   */
  async getQuestionById(
    id: string,
    tx: Prisma.TransactionClient | null = null,
  ): Promise<QuestionWithDetails> {
    const prismaClient = tx || this.prisma;
    const question = await prismaClient.questions.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            id: true,
            title: true,
            skill_type: true,
            exercise_type: true,
          },
        },
        question_groups: {
          select: {
            id: true,
            image_url: true,
            group_title: true,
            group_instruction: true,
            passage_reference: true,
            question_type: true,
            question_range: true,
            correct_answer_count: true,
            ordering: true,
            matching_options: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
            },
          },
        },
        question_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.mapQuestionToDetails(question as unknown as QuestionDetails);
  }

  /**
   *  Update Question
   */
  async updateQuestion(
    id: string,
    updateDto: UpdateQuestionTestDto,
  ): Promise<QuestionWithDetails> {
    const existingQuestion = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            id: true,
            skill_type: true,
            test_section_id: true,
          },
        },
        question_groups: {
          select: {
            id: true,
            question_type: true,
          },
        },
      },
    });

    if (!existingQuestion) {
      throw new NotFoundException('Question not found');
    }

    // Xác thực nhóm câu hỏi nếu được cung cấp
    if (updateDto.question_group_id) {
      const questionGroup = await this.prisma.question_groups.findFirst({
        where: {
          id: updateDto.question_group_id,
          exercise_id: existingQuestion.exercise_id,
          deleted: false,
        },
      });

      if (!questionGroup) {
        throw new NotFoundException(
          'Question group not found or does not belong to any exercise',
        );
      }

      // Đối với loại MATCHING, câu hỏi phải thuộc nhóm MATCHING
      if (
        (updateDto.question_type || existingQuestion.question_type) ===
          QUESTION_TYPE.MATCHING &&
        questionGroup.question_type !== QUESTION_TYPE.MATCHING
      ) {
        throw new BadRequestException(
          'MATCHING questions must belong to a MATCHING question group',
        );
      }
    } else if (
      (updateDto.question_type || existingQuestion.question_type) ===
      QUESTION_TYPE.MATCHING
    ) {
      throw new BadRequestException(
        'MATCHING questions require a question_group_id',
      );
    }

    // Xác thực yêu cầu loại câu hỏi nếu loại đang được thay đổi
    if (
      updateDto.question_type &&
      updateDto.question_type !== existingQuestion.question_type
    ) {
      this.validateQuestionTypeRequirements(updateDto);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật câu hỏi
      await tx.questions.update({
        where: { id },
        data: {
          question_group_id: updateDto.question_group_id,
          question_type: updateDto.question_type,
          question_text: updateDto.question_text,
          reading_passage: updateDto.reading_passage,
          points: updateDto.points,
          question_group: updateDto.question_group,
          explanation: updateDto.explanation,
          image_url: updateDto.image_url,
          audio_url: updateDto.audio_url,
          audio_duration: updateDto.audio_duration,
          updated_at: new Date(),
        },
      });

      // Cập nhật các tùy chọn câu hỏi nếu được cung cấp
      if (updateDto.options !== undefined) {
        // Xóa các tùy chọn hiện tại
        await tx.question_options.updateMany({
          where: { question_id: id },
          data: { deleted: true },
        });

        // Tạo các tùy chọn mới
        if (updateDto.options.length > 0) {
          await this.createQuestionOptions(
            tx,
            id,
            updateDto.options,
            updateDto.question_type,
          );
        }
      }

      // Cập nhật các tùy chọn câu trả lời đúng cho FILL_BLANK
      if (
        updateDto.question_type === QUESTION_TYPE.FILL_BLANK ||
        updateDto.question_type === QUESTION_TYPE.TRUE_FALSE
      ) {
        await tx.question_options.updateMany({
          where: { question_id: id },
          data: { deleted: true },
        });

        await this.createCorrectAnswerOptions(
          tx,
          id,
          updateDto.correct_answer,
          updateDto.alternative_answers,
        );
      }

      this.logger.log(` Updated question: ${id}`);

      // Trả về chi tiết câu hỏi đầy đủ
      return await this.getQuestionById(id, tx);
    });
  }

  /**
   *  Delete Question (soft delete)
   */
  async deleteQuestion(id: string): Promise<void> {
    const question = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
      select: {
        id: true,
        exercise_id: true,
        question_group_id: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Xóa mềm các tùy chọn câu hỏi
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
    });

    this.logger.log(` Deleted question: ${id}`);
  }

  /**
   *  Upload Image for Question
   */
  async uploadQuestionImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<QuestionWithDetails> {
    const question = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
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

      await this.prisma.questions.update({
        where: { id },
        data: {
          image_url: uploadResult.url,
          updated_at: new Date(),
        },
      });

      this.logger.log(` Uploaded image for question: ${id}`);
      return this.getQuestionById(id);
    } catch (error) {
      this.logger.error('Error uploading question image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   *  Upload Audio for Question
   */
  async uploadQuestionAudio(
    id: string,
    file: Express.Multer.File,
  ): Promise<QuestionWithDetails> {
    const question = await this.prisma.questions.findFirst({
      where: { id, deleted: false },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    try {
      const uploadResult = await this.filesService.uploadFile(
        file.buffer,
        file.originalname,
        FileType.AUDIO,
      );

      // Delete old audio if exists
      if (question.audio_url) {
        try {
          await this.filesService.deleteFiles([question.audio_url]);
        } catch (error) {
          this.logger.warn(`Failed to delete old audio: ${question.audio_url}`);
        }
      }

      await this.prisma.questions.update({
        where: { id },
        data: {
          audio_url: uploadResult.url,
          updated_at: new Date(),
        },
      });

      this.logger.log(` Uploaded audio for question: ${id}`);
      return this.getQuestionById(id);
    } catch (error) {
      this.logger.error('Error uploading question audio:', error);
      throw new BadRequestException('Failed to upload audio');
    }
  }

  /**
   *  Reorder Questions in Exercise
   */
  async reorderQuestions(
    exerciseId: string,
    questionOrders: Array<{ id: string; ordering: number }>,
  ): Promise<void> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        deleted: false,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
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
      ` Reordered ${questionOrders.length} questions in exercise: ${exerciseId}`,
    );
  }

  // ======= PRIVATE HELPER METHODS =======

  private validateQuestionTypeRequirements(
    dto: CreateQuestionTestDto | UpdateQuestionTestDto,
  ) {
    switch (dto.question_type) {
      case QUESTION_TYPE.MULTIPLE_CHOICE:
        if (!dto.options || dto.options.length < 2) {
          throw new BadRequestException(
            'Multiple choice questions require at least 2 options',
          );
        }
        break;

      case QUESTION_TYPE.TRUE_FALSE:
        if (!dto.correct_answer) {
          throw new BadRequestException(
            'True/False questions must have exactly 1 options',
          );
        }
        break;

      case QUESTION_TYPE.FILL_BLANK:
        if (!dto.correct_answer) {
          throw new BadRequestException(
            'Fill in the blank questions require a correct answer',
          );
        }
        break;

      case QUESTION_TYPE.MATCHING:
        if (!dto.question_group_id) {
          throw new BadRequestException(
            'MATCHING questions require a question_group_id',
          );
        }
        // Matching options are managed at the question_group level
        break;

      case QUESTION_TYPE.ESSAY:
      case QUESTION_TYPE.SPEAKING:
        // These types don't require options
        break;
      default:
        throw new BadRequestException('Invalid question type');
    }
  }

  private async getNextOrdering(
    tx: Prisma.TransactionClient,
    groupId: string,
  ): Promise<number> {
    if (!groupId) {
      return 0;
    }
    const lastQuestion = await tx.questions.findFirst({
      where: {
        question_group_id: groupId,
        deleted: false,
      },
      orderBy: { ordering: 'desc' },
    });

    return (lastQuestion?.ordering || -1) + 1;
  }

  private async createQuestionOptions(
    tx: Prisma.TransactionClient,
    questionId: string,
    options: Array<{
      option_text?: string;
      is_correct: boolean;
      ordering?: number;
      point?: number;
      explanation?: string;
      matching_option_id?: string;
    }>,
    questionType?: QuestionType,
  ): Promise<void> {
    for (let i = 0; i < options.length; i++) {
      let matchingOption: null | matching_options = null;
      if (questionType === QUESTION_TYPE.MATCHING) {
        if (options.length !== 1) {
          throw new BadRequestException(
            `MATCHING question options must contain exactly 1 option per question`,
          );
        }

        if (!options[i].matching_option_id) {
          throw new BadRequestException(
            `Matching option ID is required for option at index ${i} in MATCHING question`,
          );
        }
        matchingOption = await this.prisma.matching_options.findUnique({
          where: { id: options[i].matching_option_id },
        });
        if (!matchingOption) {
          throw new BadRequestException(
            `Matching option with ID ${options[i].matching_option_id} not found`,
          );
        }
      }
      const option = options[i];
      await tx.question_options.create({
        data: {
          question_id: questionId,
          option_text:
            questionType === QUESTION_TYPE.MATCHING && matchingOption
              ? matchingOption.option_text
              : option.option_text || '',
          is_correct:
            questionType === QUESTION_TYPE.MATCHING ? true : option.is_correct,
          matching_option_id: option.matching_option_id,
          ordering:
            questionType === QUESTION_TYPE.MATCHING && matchingOption
              ? matchingOption.ordering
              : option.ordering || i,
          point: option.point ?? 1,
          explanation: option.explanation,
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
          ordering: 0,
          point: 1,
        },
      });

      if (alternativeAnswers && alternativeAnswers.length > 0) {
        for (let i = 0; i < alternativeAnswers.length; i++) {
          await tx.question_options.create({
            data: {
              question_id: questionId,
              option_text: alternativeAnswers[i],
              is_correct: true,
              ordering: i + 1,
              point: 1,
            },
          });
        }
      }
    }
  }

  private mapQuestionToDetails(question: QuestionDetails): QuestionWithDetails {
    return {
      id: question.id,
      exercise_id: question.exercise_id,
      question_group_id: question.question_group_id,
      question_type: question.question_type,
      question_text: question.question_text,
      reading_passage: question.reading_passage,
      ordering: question.ordering,
      points: question.points,
      question_group: question.question_group,
      explanation: question.explanation,
      image_url: question.image_url,
      audio_url: question.audio_url,
      audio_duration: question.audio_duration,
      group: question.question_groups,
      options: question.question_options || [],
      created_at: question.created_at,
      updated_at: question.updated_at,
    };
  }

  /**
   * Count number correct answers by total options marked correct by sectionId
   * Know: section -> exercises -> question groups -> questions -> question_options
   * or: section -> exercises -> questions -> question_options
   */
  async countCorrectAnswersBySection(sectionId: string): Promise<number> {
    const exercises = await this.prisma.exercises.findMany({
      where: {
        test_section_id: sectionId,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    const exerciseIds = exercises.map((ex) => ex.id);

    const correctAnswersCount = await this.prisma.question_options.count({
      where: {
        questions: {
          exercise_id: { in: exerciseIds },
          deleted: false,
        },
        is_correct: true,
        deleted: false,
      },
    });

    return correctAnswersCount;
  }

  /**
   * Calculate total correct answers for section when add new question or update question
   * @param sectionId
   * @param newCorrectAnswers
   * @param oldQuestionId (provide if update else undefined)
   */
  async calculateTotalCorrectAnswersForSection(
    sectionId: string,
    newCorrectAnswers: number,
    oldQuestionId?: string,
  ): Promise<number> {
    const exercises = await this.prisma.exercises.findMany({
      where: {
        test_section_id: sectionId,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    const exerciseIds = exercises.map((ex) => ex.id);

    let existingCorrectAnswers = 0;
    if (oldQuestionId) {
      existingCorrectAnswers = await this.prisma.question_options.count({
        where: {
          question_id: oldQuestionId,
          is_correct: true,
          deleted: false,
        },
      });
    }

    const totalCorrectAnswers = await this.prisma.question_options.count({
      where: {
        questions: {
          exercise_id: { in: exerciseIds },
          deleted: false,
          id: oldQuestionId ? { not: oldQuestionId } : undefined,
        },
        is_correct: true,
        deleted: false,
      },
    });

    return totalCorrectAnswers - existingCorrectAnswers + newCorrectAnswers;
  }
}
