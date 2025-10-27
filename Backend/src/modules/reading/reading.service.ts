// src/modules/reading/reading.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FileType } from 'src/common/constants';
import { FilesService } from 'src/modules/files/files.service';
import { SECTION_TYPE } from 'src/modules/mock-tests/constants';
import { CreateReadingExerciseDto } from 'src/modules/reading/dto/create-reading.dto';
import { UpdateReadingExerciseDto } from 'src/modules/reading/dto/update-reading.dto';
import {
  EXERCISE_TYPE,
  QuestionWithDetails,
  ReadingExerciseContent,
  SKILL_TYPE,
} from 'src/modules/reading/types/reading.types';
import { PrismaService } from 'src/prisma/prisma.service';

// Type definitions for better type safety
type ExerciseWithIncludes = Prisma.exercisesGetPayload<{
  include: {
    test_sections: {
      include: {
        mock_tests: {
          select: {
            id: true;
            title: true;
            test_type: true;
          };
        };
      };
    };
    lessons: {
      select: {
        id: true;
        title: true;
        sections: {
          select: {
            id: true;
            title: true;
            courses: {
              select: {
                id: true;
                title: true;
              };
            };
          };
        };
      };
    };
    _count: {
      select: {
        questions: {
          where: {
            deleted: false;
          };
        };
      };
    };
  };
}>;

type QuestionWithOptions = Prisma.questionsGetPayload<{
  include: {
    question_options: {
      where: {
        deleted: false;
      };
      orderBy: {
        ordering: 'asc';
      };
    };
    matching_sets: {
      include: {
        matching_options: {
          where: {
            deleted: false;
          };
          orderBy: {
            ordering: 'asc';
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService,
  ) {}

  /**
   * 📚 Create Reading Exercise in test section
   */
  async createReadingExercise(
    createDto: CreateReadingExerciseDto,
  ): Promise<ExerciseWithIncludes> {
    // Validate test_section exists and is reading type
    const testSection = await this.prisma.test_sections.findFirst({
      where: {
        id: createDto.test_section_id,
        section_type: SECTION_TYPE.READING,
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
        skill_type: SKILL_TYPE.READING,
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
        skill_type: SKILL_TYPE.READING,
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
      `✅ Created reading exercise: ${exercise.title} in test section: ${testSection.section_name}`,
    );
    return exercise;
  }

  /**
   * 📖 Get Reading Exercises by test section
   */
  async getReadingExercisesByTestSection(testSectionId: string) {
    // Validate test section exists
    const testSection = await this.prisma.test_sections.findFirst({
      where: {
        id: testSectionId,
        section_type: SECTION_TYPE.READING,
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
        exercises: true,
      },
    });

    if (!testSection) {
      throw new NotFoundException('Reading test section not found');
    }

    return testSection.exercises.filter((ex) => !ex.deleted);
  }

  /**
   * 🔍 Get Reading Exercise by ID with questions
   */
  async getReadingExerciseById(id: string): Promise<{
    exercise: ExerciseWithIncludes;
    reading_passage: ReadingExerciseContent['reading_passage'];
    questions: QuestionWithDetails[];
    question_groups: Array<{
      group_name: string;
      questions: QuestionWithDetails[];
    }>;
    total_questions: number;
  }> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.READING,
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
        _count: {
          select: {
            questions: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    // Get questions separately for better control
    const questionsData = await this.prisma.questions.findMany({
      where: {
        exercise_id: id,
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

    const questions: QuestionWithDetails[] = questionsData.map((question) =>
      this.mapQuestionToDetails(question),
    );
    const reading_passage = this.extractPassageInfo(exercise.content);
    const question_groups = this.groupQuestionsByType(questions);

    return {
      exercise,
      reading_passage,
      questions,
      question_groups,
      total_questions: questions.length,
    };
  }

  /**
   * ✏️ Update Reading Exercise
   */
  async updateReadingExercise(
    id: string,
    updateDto: UpdateReadingExerciseDto,
  ): Promise<ExerciseWithIncludes> {
    const existingExercise = await this.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.READING,
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
        _count: {
          select: {
            questions: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    this.logger.log(`✅ Updated reading exercise: ${id}`);
    return exercise;
  }

  /**
   * 🗑️ Delete Reading Exercise (soft delete)
   */
  async deleteReadingExercise(id: string): Promise<void> {
    const exercise = await this.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.READING,
        deleted: false,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Reading exercise not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Get all questions for this exercise
      const questionIds = await tx.questions.findMany({
        where: { exercise_id: id, deleted: false },
        select: { id: true },
      });

      if (questionIds.length > 0) {
        const ids = questionIds.map((q) => q.id);

        // Soft delete question options
        await tx.question_options.updateMany({
          where: { question_id: { in: ids } },
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

    this.logger.log(`✅ Deleted reading exercise: ${id}`);
  }

  /**
   * 📊 Get All Mock Tests with Reading Sections
   */
  async getMockTestsWithReadingSections(): Promise<
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
            section_type: SECTION_TYPE.READING,
            deleted: false,
          },
          include: {
            exercises: {
              where: {
                skill_type: SKILL_TYPE.READING,
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
        })),
      })),
    }));
  }

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

  private mapQuestionToDetails(
    question: QuestionWithOptions,
  ): QuestionWithDetails {
    return {
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      image_url: question.image_url || undefined,
      audio_url: question.audio_url || undefined,
      reading_passage: question.reading_passage || undefined,
      explanation: question.explanation || undefined,
      points: Number(question.points),
      correct_answer_count: Number(question.correct_answer_count) || 1,
      ordering: question.ordering || 0,
      difficulty_level: question.difficulty_level
        ? Number(question.difficulty_level)
        : undefined,
      question_group: question.question_group || undefined,
      question_options: question.question_options.map((option) => ({
        id: option.id,
        option_text: option.option_text,
        is_correct: option.is_correct ?? false,
        ordering: option.ordering ?? 0,
        point: Number(option.point ?? 0),
        explanation: option.explanation || undefined,
      })),
      matching_sets: question.matching_sets
        ? {
            id: question.matching_sets?.id ?? '',
            title: question.matching_sets?.title ?? '',
            matching_options:
              question.matching_sets?.matching_options?.map((option) => ({
                id: option.id,
                option_text: option.option_text,
                ordering: option.ordering ?? 0,
              })) ?? [],
          }
        : undefined,
    };
  }

  private groupQuestionsByType(questions: QuestionWithDetails[]): Array<{
    group_name: string;
    questions: QuestionWithDetails[];
  }> {
    const groups = questions.reduce(
      (acc, question) => {
        const groupKey = question.question_group || 'default';
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(question);
        return acc;
      },
      {} as Record<string, QuestionWithDetails[]>,
    );

    return Object.entries(groups).map(([groupName, questions]) => ({
      group_name: groupName,
      questions,
    }));
  }
}
