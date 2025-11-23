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
  QuestionGroupDetails,
  QuestionGroupWithDetails,
} from 'src/modules/question-groups/types/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateQuestionGroupDto } from './dto/create-question-group.dto';
import { UpdateQuestionGroupDto } from './dto/update-question-group.dto';

@Injectable()
export class QuestionGroupsService {
  private readonly logger = new Logger(QuestionGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Create Question Group for Exercise
   */
  async createQuestionGroup(createDto: CreateQuestionGroupDto) {
    // Validate exercise exists
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id: createDto.exercise_id,
        deleted: false,
      },
      select: {
        id: true,
        title: true,
        skill_type: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Validate ordering uniqueness within exercise
    if (createDto.ordering !== undefined) {
      const existingGroup = await this.prisma.question_groups.findFirst({
        where: {
          exercise_id: createDto.exercise_id,
          ordering: createDto.ordering,
          deleted: false,
        },
      });

      if (existingGroup) {
        throw new ConflictException(
          `Question group with ordering ${createDto.ordering} already exists in this exercise`,
        );
      }
    }

    // Validate matching options for MATCHING type
    if (createDto.question_type === QUESTION_TYPE.MATCHING) {
      if (
        !createDto.matching_options ||
        createDto.matching_options.length === 0
      ) {
        throw new BadRequestException(
          'MATCHING question groups must have matching_options',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Get next ordering if not provided
      const ordering =
        createDto.ordering ??
        (await this.getNextOrdering(tx, createDto.exercise_id));

      // Create question group
      const questionGroup = await tx.question_groups.create({
        data: {
          exercise_id: createDto.exercise_id,
          image_url: createDto.image_url,
          group_title: createDto.group_title,
          group_instruction: createDto.group_instruction,
          passage_reference: createDto.passage_reference,
          question_type: createDto.question_type,
          ordering: ordering,
          question_range: createDto.question_range,
          correct_answer_count: createDto.correct_answer_count || 1,
        },
      });

      // Create matching options if provided
      if (
        createDto.question_type === QUESTION_TYPE.MATCHING &&
        createDto.matching_options &&
        createDto.matching_options.length > 0
      ) {
        await this.createMatchingOptions(
          tx,
          questionGroup.id,
          createDto.matching_options,
        );
      }

      this.logger.log(
        `Created question group for exercise: ${createDto.exercise_id}`,
      );

      // Return complete question group details
      return await this.getQuestionGroupById(questionGroup.id, tx);
    });
  }

  /**
   * Get Question Groups by Exercise ID
   */
  async getQuestionGroupsByExercise(exerciseId: string) {
    // Validate exercise exists
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

    const groupsData = await this.prisma.question_groups.findMany({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      include: {
        matching_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
        questions: {
          where: { deleted: false },
          select: {
            id: true,
            question_text: true,
            ordering: true,
          },
          orderBy: { ordering: 'asc' },
        },
      },
      orderBy: { ordering: 'asc' },
    });

    const groups: QuestionGroupWithDetails[] = groupsData.map((group) =>
      this.mapQuestionGroupToDetails(group as unknown as QuestionGroupDetails),
    );

    return {
      groups,
      total_groups: groups.length,
      exercise_info: exercise,
    };
  }

  /**
   * Get Question Group by ID
   */
  async getQuestionGroupById(
    id: string,
    tx: Prisma.TransactionClient | null = null,
  ): Promise<QuestionGroupWithDetails> {
    const model = tx ?? this.prisma;
    const questionGroup = await model.question_groups.findFirst({
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
        matching_options: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
        questions: {
          where: { deleted: false },
          select: {
            id: true,
            question_text: true,
            ordering: true,
          },
          orderBy: { ordering: 'asc' },
        },
      },
    });

    if (!questionGroup) {
      throw new NotFoundException('Question group not found');
    }

    return this.mapQuestionGroupToDetails(
      questionGroup as unknown as QuestionGroupDetails,
    );
  }

  /**
   * Update Question Group
   */
  async updateQuestionGroup(
    id: string,
    updateDto: UpdateQuestionGroupDto,
  ): Promise<QuestionGroupWithDetails> {
    const existingGroup = await this.prisma.question_groups.findFirst({
      where: { id, deleted: false },
      include: {
        exercises: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingGroup) {
      throw new NotFoundException('Question group not found');
    }

    // Validate ordering uniqueness if being updated
    if (
      updateDto.ordering !== undefined &&
      updateDto.ordering !== existingGroup.ordering
    ) {
      const conflictingGroup = await this.prisma.question_groups.findFirst({
        where: {
          exercise_id: existingGroup.exercise_id,
          ordering: updateDto.ordering,
          deleted: false,
          id: { not: id },
        },
      });

      if (conflictingGroup) {
        throw new ConflictException(
          `Question group with ordering ${updateDto.ordering} already exists in this exercise`,
        );
      }
    }

    // Validate matching options for MATCHING type
    if (
      updateDto.question_type === QUESTION_TYPE.MATCHING &&
      updateDto.matching_options
    ) {
      if (updateDto.matching_options.length === 0) {
        throw new BadRequestException(
          'MATCHING question groups must have matching_options',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update matching options if provided
      if (updateDto.matching_options !== undefined) {
        // Delete existing matching options
        await tx.matching_options.updateMany({
          where: { set_id: id },
          data: { deleted: true, updated_at: new Date() },
        });

        // Create new matching options if provided
        if (updateDto.matching_options.length > 0) {
          await this.createMatchingOptions(tx, id, updateDto.matching_options);
        }
      }

      // Update question group
      await tx.question_groups.update({
        where: { id },
        data: {
          image_url: updateDto.image_url,
          group_title: updateDto.group_title,
          group_instruction: updateDto.group_instruction,
          passage_reference: updateDto.passage_reference,
          question_type: updateDto.question_type,
          ordering: updateDto.ordering,
          question_range: updateDto.question_range,
          correct_answer_count: updateDto.correct_answer_count,
          updated_at: new Date(),
        },
      });

      this.logger.log(`Updated question group: ${id}`);

      // Return complete question group details
      return await this.getQuestionGroupById(id, tx);
    });
  }

  /**
   * Delete Question Group (soft delete)
   */
  async deleteQuestionGroup(id: string): Promise<void> {
    const questionGroup = await this.prisma.question_groups.findFirst({
      where: { id, deleted: false },
      select: {
        id: true,
        exercise_id: true,
      },
    });

    if (!questionGroup) {
      throw new NotFoundException('Question group not found');
    }

    // Check if there are questions in this group
    const questionsCount = await this.prisma.questions.count({
      where: {
        question_group_id: id,
        deleted: false,
      },
    });

    if (questionsCount > 0) {
      throw new BadRequestException(
        `Cannot delete question group with ${questionsCount} active questions. Please delete or reassign the questions first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete matching options
      await tx.matching_options.updateMany({
        where: { set_id: id },
        data: {
          deleted: true,
          updated_at: new Date(),
        },
      });

      // Soft delete question group
      await tx.question_groups.update({
        where: { id },
        data: {
          deleted: true,
          updated_at: new Date(),
        },
      });
    });

    this.logger.log(`Deleted question group: ${id}`);
  }

  /**
   * Upload Image for Question Group
   */
  async uploadQuestionGroupImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<QuestionGroupWithDetails> {
    const questionGroup = await this.prisma.question_groups.findFirst({
      where: { id, deleted: false },
    });

    if (!questionGroup) {
      throw new NotFoundException('Question group not found');
    }

    try {
      const uploadResult = await this.filesService.uploadFile(
        file.buffer,
        file.originalname,
        FileType.EXERCISE_IMAGE,
      );

      // Delete old image if exists
      if (questionGroup.image_url) {
        try {
          await this.filesService.deleteFiles([questionGroup.image_url]);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old image: ${questionGroup.image_url}`,
          );
        }
      }

      await this.prisma.question_groups.update({
        where: { id },
        data: {
          image_url: uploadResult.url,
          updated_at: new Date(),
        },
      });

      this.logger.log(`Uploaded image for question group: ${id}`);
      return this.getQuestionGroupById(id);
    } catch (error) {
      this.logger.error('Error uploading question group image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Reorder Question Groups in Exercise
   */
  async reorderQuestionGroups(
    exerciseId: string,
    groupOrders: Array<{ id: string; ordering: number }>,
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

    // Validate all question groups belong to this exercise
    const groupIds = groupOrders.map((g) => g.id);
    const groups = await this.prisma.question_groups.findMany({
      where: {
        id: { in: groupIds },
        exercise_id: exerciseId,
        deleted: false,
      },
    });

    if (groups.length !== groupIds.length) {
      throw new BadRequestException(
        'Some question groups do not belong to this exercise',
      );
    }

    // Check for duplicate ordering values
    const orderings = groupOrders.map((g) => g.ordering);
    if (new Set(orderings).size !== orderings.length) {
      throw new BadRequestException(
        'Duplicate ordering values are not allowed',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const { id, ordering } of groupOrders) {
        await tx.question_groups.update({
          where: { id },
          data: {
            ordering,
            updated_at: new Date(),
          },
        });
      }
    });

    this.logger.log(
      ` Reordered ${groupOrders.length} question groups in exercise: ${exerciseId}`,
    );
  }

  // ======= PRIVATE HELPER METHODS =======

  private async getNextOrdering(
    tx: Prisma.TransactionClient,
    exerciseId: string,
  ): Promise<number> {
    const lastGroup = await tx.question_groups.findFirst({
      where: {
        exercise_id: exerciseId,
        deleted: false,
      },
      orderBy: { ordering: 'desc' },
    });

    return (lastGroup?.ordering || -1) + 1;
  }

  private async createMatchingOptions(
    tx: Prisma.TransactionClient,
    questionGroupId: string,
    options: Array<{ option_text: string; ordering?: number }>,
  ): Promise<void> {
    for (const [index, option] of options.entries()) {
      await tx.matching_options.create({
        data: {
          set_id: questionGroupId,
          option_text: option.option_text,
          ordering: option.ordering ?? index,
        },
      });
    }
  }

  private mapQuestionGroupToDetails(
    group: QuestionGroupDetails,
  ): QuestionGroupWithDetails {
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
      matching_options: group.matching_options || [],
      questions_count: group.questions?.length || 0,
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  }
}
