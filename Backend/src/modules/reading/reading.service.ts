import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SECTION_TYPE, SectionType } from 'src/modules/mock-tests/constants';
import {
  QuestionDetails,
  QuestionOptionDetails,
} from 'src/modules/questions/types/types';
import { CreateReadingExerciseDto } from 'src/modules/reading/dto/create-reading.dto';
import { UpdateReadingExerciseDto } from 'src/modules/reading/dto/update-reading.dto';
import {
  EXERCISE_TYPE,
  QuestionWithDetails,
  ReadingExerciseContent,
  ReadingExerciseWithDetails,
  SKILL_TYPE,
} from 'src/modules/reading/types/reading.types';
import { VideoService } from 'src/modules/video/video.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SkillType } from './types/reading.types';

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
  ) {}

  /**
   *  Create Reading Exercise in test section
   */
  async createExercise(
    createDto: CreateReadingExerciseDto,
    sectionType: SectionType = SECTION_TYPE.READING,
    skillType: SkillType = SKILL_TYPE.READING,
  ) {
    // Validate test_section exists and is reading type
    const testSection = await this.prisma.test_sections.findFirst({
      where: {
        id: createDto.test_section_id,
        section_type: sectionType,
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
      throw new NotFoundException('Reading test section not found');
    }

    // Check if exercise with same title exists in this test section
    const existingExercise = await this.prisma.exercises.findFirst({
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

    const exerciseContent: ReadingExerciseContent = {
      reading_passage: {
        title: createDto.passage.title,
        content: createDto.passage.content,
        paragraphs: createDto.passage.paragraphs || [],
        word_count:
          createDto.passage.word_count ||
          this.calculateWordCount(createDto.passage.content),
        difficulty_level: createDto.passage.difficulty_level || 5.0,
        estimated_reading_time: this.calculateReadingTime(
          createDto.passage.word_count ||
            this.calculateWordCount(createDto.passage.content),
        ),
      },
      exercise_metadata: {
        skill_type: skillType,
        created_at: new Date(),
        total_questions: 0,
        question_types: [],
      },
    };

    const exercise = await this.prisma.exercises.create({
      data: {
        test_section_id: createDto.test_section_id,
        lesson_id: null, // Mock test exercise doesn't belong to lesson
        title: createDto.title,
        instruction: createDto.instruction || '',
        content: exerciseContent as unknown as Prisma.JsonObject,
        exercise_type: EXERCISE_TYPE.MOCK_TEST,
        skill_type: skillType,
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
      ` Created reading exercise: ${exercise.title} in test section: ${testSection.section_name}`,
    );
    return exercise;
  }

  /**
   *  Get Reading Exercises by test section
   */
  async getExercisesByTestSection(
    testSectionId: string,
    sectionType: SectionType = SECTION_TYPE.READING,
    skillType: SkillType = SKILL_TYPE.READING,
  ) {
    // Validate test section exists
    const testSection = await this.prisma.test_sections.findFirst({
      where: {
        id: testSectionId,
        section_type: sectionType,
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
      throw new NotFoundException('Reading test section not found');
    }

    const exercises = await this.prisma.exercises.findMany({
      where: {
        test_section_id: testSectionId,
        skill_type: skillType,
        deleted: false,
      },
      include: {
        _count: {
          select: {
            questions: {
              where: { deleted: false },
            },
            question_groups: {
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
        reading_passage: this.extractPassageInfo(ex.content),
        total_questions: ex._count.questions,
        total_question_groups: ex._count.question_groups,
        audio_url: ex.audio_url
          ? this.videoService.getVideoHLSUrl(ex.audio_url)
          : null,
      })),
    };
  }

  /**
   *  Get Reading Exercise by ID with complete details
   */
  async getExerciseById(
    id: string,
    skillType: SkillType = SKILL_TYPE.READING,
  ): Promise<ReadingExerciseWithDetails> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: skillType,
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
      throw new NotFoundException('Reading exercise not found');
    }

    // get hls if audio_url exists
    let hls_url: string | null = null;
    if (exercise.audio_url) {
      hls_url = await this.videoService.getVideoHLSUrl(exercise.audio_url);
    }

    // Get question groups with their questions and matching options
    const questionGroupsData = await this.prisma.question_groups.findMany({
      where: {
        exercise_id: id,
        deleted: false,
      },
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
    });

    // Get ungrouped questions
    const ungroupedQuestionsData = await this.prisma.questions.findMany({
      where: {
        exercise_id: id,
        question_group_id: null,
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

    const reading_passage = this.extractPassageInfo(exercise.content);

    const question_groups = questionGroupsData.map((group) => ({
      id: group.id,
      group_title: group.group_title || undefined,
      group_instruction: group.group_instruction,
      passage_reference: group.passage_reference || undefined,
      question_type: group.question_type,
      question_range: group.question_range || undefined,
      correct_answer_count: group.correct_answer_count,
      ordering: group.ordering,
      matching_options: group.matching_options.map((opt) => ({
        id: opt.id,
        option_text: opt.option_text,
        ordering: opt.ordering,
      })),
      questions: group.questions.map((q) =>
        this.mapQuestionToDetails(q as unknown as QuestionDetails),
      ),
    }));

    const ungrouped_questions = ungroupedQuestionsData.map((q) =>
      this.mapQuestionToDetails(q as unknown as QuestionDetails),
    );

    const all_questions = [
      ...question_groups.flatMap((g) => g.questions),
      ...ungrouped_questions,
    ];

    return {
      id: exercise.id,
      title: exercise.title,
      instruction: exercise.instruction,
      exercise_type: exercise.exercise_type,
      skill_type: exercise.skill_type,
      time_limit: exercise.time_limit,
      passing_score: exercise.passing_score || undefined,
      ordering: exercise.ordering,
      reading_passage,
      question_groups,
      ungrouped_questions,
      audio_url: hls_url,
      total_questions: all_questions.length,
      total_points: all_questions.reduce((sum, q) => sum + q.points, 0),
    };
  }

  /**
   *  Update Reading Exercise
   */
  async updateExercise(
    id: string,
    updateDto: UpdateReadingExerciseDto,
    skillType: SkillType = SKILL_TYPE.READING,
  ) {
    const existingExercise = await this.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: skillType,
        deleted: false,
      },
    });

    if (!existingExercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    // Check for title conflict if title is being updated
    if (updateDto.title && updateDto.title !== existingExercise.title) {
      const conflictingExercise = await this.prisma.exercises.findFirst({
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

    const existingContent =
      existingExercise.content as unknown as ReadingExerciseContent;

    const updatedContent: ReadingExerciseContent = {
      ...existingContent,
      reading_passage: updateDto.passage
        ? {
            title: updateDto.passage.title,
            content: updateDto.passage.content,
            paragraphs:
              updateDto.passage.paragraphs ||
              existingContent.reading_passage?.paragraphs ||
              [],
            word_count:
              updateDto.passage.word_count ||
              this.calculateWordCount(updateDto.passage.content),
            difficulty_level:
              updateDto.passage.difficulty_level ||
              existingContent.reading_passage?.difficulty_level ||
              5.0,
            estimated_reading_time: this.calculateReadingTime(
              updateDto.passage.word_count ||
                this.calculateWordCount(updateDto.passage.content),
            ),
          }
        : existingContent.reading_passage,
      exercise_metadata: {
        ...existingContent.exercise_metadata,
        updated_at: new Date(),
      },
    };

    const exercise = await this.prisma.exercises.update({
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
            question_groups: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    this.logger.log(` Updated reading exercise: ${id}`);
    return {
      ...exercise,
      reading_passage: this.extractPassageInfo(exercise.content),
    };
  }

  /**
   *  Delete Reading Exercise (soft delete)
   */
  async deleteExercise(
    id: string,
    skillType: SkillType = SKILL_TYPE.READING,
  ): Promise<void> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: skillType,
        deleted: false,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Get all question groups
      const questionGroups = await tx.question_groups.findMany({
        where: { exercise_id: id, deleted: false },
        select: { id: true },
      });

      if (questionGroups.length > 0) {
        const groupIds = questionGroups.map((g) => g.id);

        // Soft delete matching options
        await tx.matching_options.updateMany({
          where: { set_id: { in: groupIds } },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });

        // Soft delete question groups
        await tx.question_groups.updateMany({
          where: { exercise_id: id },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });
      }

      // Get all questions for this exercise
      const questions = await tx.questions.findMany({
        where: { exercise_id: id, deleted: false },
        select: { id: true },
      });

      if (questions.length > 0) {
        const questionIds = questions.map((q) => q.id);

        // Soft delete question options
        await tx.question_options.updateMany({
          where: { question_id: { in: questionIds } },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });

        // Soft delete questions
        await tx.questions.updateMany({
          where: { exercise_id: id },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });
      }

      // Soft delete exercise
      await tx.exercises.update({
        where: { id },
        data: {
          deleted: true,
          updated_at: new Date(),
        },
      });
    });

    this.logger.log(` Deleted reading exercise: ${id}`);
  }

  /**
   *  Get All Mock Tests with Reading Sections
   */
  async getMockTestsWithSections(
    sectionType: SectionType = SECTION_TYPE.READING,
    skillType: SkillType = SKILL_TYPE.READING,
  ): Promise<
    Array<{
      id: string;
      title: string;
      test_type: string;
      reading_sections: Array<{
        id: string;
        section_name: string;
        exercises: Array<{
          id: string;
          title: string;
          passage_info: ReadingExerciseContent['reading_passage'];
          total_questions: number;
          total_question_groups: number;
        }>;
      }>;
    }>
  > {
    const mockTests = await this.prisma.mock_tests.findMany({
      where: {
        OR: [{ test_type: 'reading' }, { test_type: 'full_test' }],
        deleted: false,
      },
      include: {
        test_sections: {
          where: {
            section_type: sectionType,
            deleted: false,
          },
          include: {
            exercises: {
              where: {
                skill_type: skillType,
                deleted: false,
              },
              include: {
                _count: {
                  select: {
                    questions: {
                      where: { deleted: false },
                    },
                    question_groups: {
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

    return mockTests.map((test) => ({
      id: test.id,
      title: test.title,
      test_type: test.test_type || '',
      reading_sections: test.test_sections.map((section) => ({
        id: section.id,
        section_name: section.section_name,
        exercises: section.exercises.map((exercise) => ({
          id: exercise.id,
          title: exercise.title,
          passage_info: this.extractPassageInfo(exercise.content),
          total_questions: exercise._count.questions,
          total_question_groups: exercise._count.question_groups,
        })),
      })),
    }));
  }

  // ======= PRIVATE HELPER METHODS =======

  private calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  private calculateReadingTime(wordCount: number): number {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }

  private extractPassageInfo(
    content: any,
  ): ReadingExerciseContent['reading_passage'] {
    const parsedContent = content as ReadingExerciseContent;
    return parsedContent?.reading_passage || null;
  }

  private mapQuestionToDetails(question: QuestionDetails): QuestionWithDetails {
    return {
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      image_url: question.image_url || undefined,
      audio_url: question.audio_url || undefined,
      audio_duration: question.audio_duration || undefined,
      reading_passage: question.reading_passage || undefined,
      explanation: question.explanation || undefined,
      points: Number(question.points),
      ordering: question.ordering || 0,
      question_group: question.question_group || undefined,
      question_group_id: question.question_group_id || undefined,
      question_options:
        question.question_options?.map((option: QuestionOptionDetails) => ({
          id: option.id,
          option_text: option.option_text,
          is_correct: option.is_correct ?? false,
          ordering: option.ordering ?? 0,
          point: Number(option.point ?? 0),
          explanation: option.explanation || undefined,
        })) || [],
    };
  }
}
