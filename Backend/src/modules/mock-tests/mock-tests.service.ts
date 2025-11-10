import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  MOCK_TEST_RESULT_STATUS,
  SectionType,
  TEST_TYPE,
  TestType,
} from 'src/modules/mock-tests/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import { CreateMockTestDto } from './dto/create-mock-test.dto';
import { UpdateMockTestDto } from './dto/update-mock-test.dto';

// Type definitions for better type safety
type MockTestWithIncludes = Prisma.mock_testsGetPayload<{
  include: {
    test_sections: {
      where: {
        deleted: false;
      };
      include: {
        exercises: {
          where: {
            deleted: false;
          };
          include: {
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
          orderBy: {
            ordering: 'asc';
          };
        };
      };
      orderBy: {
        ordering: 'asc';
      };
    };
    _count: {
      select: {
        test_sections: {
          where: {
            deleted: false;
          };
        };
      };
    };
  };
}>;

interface TestSection {
  section_name: string;
  section_type: SectionType;
  time_limit?: number;
  ordering?: number;
  instructions?: string;
  description?: string;
}

@Injectable()
export class MockTestsService {
  private readonly logger = new Logger(MockTestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  /**
   * Create Mock Test with Sections
   */
  async create(createDto: CreateMockTestDto): Promise<MockTestWithIncludes> {
    // Check if test with same title exists
    const existingTest = await this.prisma.mock_tests.findFirst({
      where: {
        title: createDto.title,
        deleted: false,
      },
    });

    if (existingTest) {
      throw new ConflictException('Mock test with this title already exists');
    }

    // Validate sections for test type
    this.validateTestSections(
      createDto.test_type as unknown as SectionType,
      createDto.test_sections,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Create mock test
      const mockTest = await tx.mock_tests.create({
        data: {
          title: createDto.title,
          test_type: createDto.test_type,
          description: createDto.description,
          instructions: createDto.instructions,
          duration:
            createDto.duration || this.getDefaultTimeLimit(createDto.test_type),
          difficulty_level: createDto.difficulty_level?.toString() || '6.0',
        },
      });

      // Create test sections if provided
      if (createDto.test_sections && createDto.test_sections.length > 0) {
        for (const [index, sectionDto] of createDto.test_sections.entries()) {
          await tx.test_sections.create({
            data: {
              mock_test_id: mockTest.id,
              section_name: sectionDto.section_name,
              section_type: sectionDto.section_type,
              duration:
                sectionDto.duration ||
                this.getDefaultSectionTimeLimit(sectionDto.section_type),
              ordering: sectionDto.ordering ?? index + 1,
              description: sectionDto.instructions,
            },
          });
        }
      } else {
        // Create default sections based on test type
        await this.createDefaultSections(tx, mockTest.id, createDto.test_type);
      }

      this.logger.log(`Created mock test: ${mockTest.title}`);

      // Return with includes
      return await tx.mock_tests.findUniqueOrThrow({
        where: { id: mockTest.id },
        include: {
          test_sections: {
            where: { deleted: false },
            include: {
              exercises: {
                where: { deleted: false },
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
          _count: {
            select: {
              test_sections: {
                where: { deleted: false },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Get All Mock Tests
   */
  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.mock_testsWhereInput = {
      deleted: false,
      ...this.utilsService.buildWhereFromQuery(rawQuery),
    };

    return this.utilsService.paginate<
      Prisma.mock_testsWhereInput,
      Prisma.mock_testsInclude,
      Prisma.mock_testsSelect,
      Prisma.mock_testsOrderByWithRelationInput
    >({
      model: this.prisma.mock_tests,
      query,
      defaultOrderBy: { created_at: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        difficulty_level: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  /**
   * Get Mock Test by ID
   */
  async findOne(id: string): Promise<MockTestWithIncludes> {
    const mockTest = await this.prisma.mock_tests.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        test_sections: {
          where: { deleted: false },
          include: {
            exercises: {
              where: { deleted: false },
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
        _count: {
          select: {
            test_sections: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    if (!mockTest) {
      throw new NotFoundException('Mock test not found');
    }

    return mockTest;
  }

  /**
   * Update Mock Test
   */
  async update(
    id: string,
    updateDto: UpdateMockTestDto,
  ): Promise<MockTestWithIncludes> {
    const existingTest = await this.prisma.mock_tests.findFirst({
      where: { id, deleted: false },
    });

    if (!existingTest) {
      throw new NotFoundException('Mock test not found');
    }

    // Check title conflict if updating
    if (updateDto.title && updateDto.title !== existingTest.title) {
      const conflictingTest = await this.prisma.mock_tests.findFirst({
        where: {
          title: updateDto.title,
          deleted: false,
          id: { not: id },
        },
      });

      if (conflictingTest) {
        throw new ConflictException('Mock test with this title already exists');
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedTest = await tx.mock_tests.update({
        where: { id },
        data: {
          title: updateDto.title,
          test_type: updateDto.test_type,
          description: updateDto.description,
          instructions: updateDto.instructions,
          difficulty_level: updateDto.difficulty_level?.toString(),
          duration: updateDto.duration || existingTest.duration,
          updated_at: new Date(),
        },
      });

      // update test sections if provided
      if (updateDto.test_sections && updateDto.test_sections.length > 0) {
        const sectionIdsToKeep = updateDto.test_sections
          .map((s) => s.section_id)
          .filter((id): id is string => typeof id === 'string');

        // Soft delete sections not in the update list
        await tx.test_sections.updateMany({
          where: {
            mock_test_id: id,
            id: { notIn: sectionIdsToKeep },
            deleted: false,
          },
          data: { deleted: true, updated_at: new Date() },
        });

        for (const [index, sectionDto] of updateDto.test_sections.entries()) {
          if (sectionDto.section_id) {
            // Update existing section
            await tx.test_sections.update({
              where: { id: sectionDto.section_id },
              data: {
                section_name: sectionDto.section_name,
                section_type: sectionDto.section_type,
                duration:
                  sectionDto.duration ||
                  this.getDefaultSectionTimeLimit(sectionDto.section_type),
                ordering: sectionDto.ordering ?? index + 1,
                description: sectionDto.instructions,
                updated_at: new Date(),
              },
            });
          } else {
            // Create new section
            await tx.test_sections.create({
              data: {
                mock_test_id: id,
                section_name: sectionDto.section_name,
                section_type: sectionDto.section_type,
                duration:
                  sectionDto.duration ||
                  this.getDefaultSectionTimeLimit(sectionDto.section_type),
                ordering: sectionDto.ordering ?? index + 1,
                description: sectionDto.instructions,
              },
            });
          }
        }
      }

      this.logger.log(`Updated mock test: ${updatedTest.title}`);

      return await tx.mock_tests.findUniqueOrThrow({
        where: { id: existingTest.id },
        include: {
          test_sections: {
            where: { deleted: false },
            include: {
              exercises: {
                where: { deleted: false },
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
          _count: {
            select: {
              test_sections: {
                where: { deleted: false },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Delete Mock Test (soft delete)
   */
  async remove(id: string): Promise<void> {
    const mockTest = await this.prisma.mock_tests.findFirst({
      where: { id, deleted: false },
    });

    if (!mockTest) {
      throw new NotFoundException('Mock test not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Get all test sections
      const testSections = await tx.test_sections.findMany({
        where: { mock_test_id: id, deleted: false },
        select: { id: true },
      });

      if (testSections.length > 0) {
        const sectionIds = testSections.map((s) => s.id);

        // Get all exercises
        const exercises = await tx.exercises.findMany({
          where: { test_section_id: { in: sectionIds }, deleted: false },
          select: { id: true },
        });

        if (exercises.length > 0) {
          const exerciseIds = exercises.map((e) => e.id);

          // Get all questions
          const questions = await tx.questions.findMany({
            where: { exercise_id: { in: exerciseIds }, deleted: false },
            select: { id: true },
          });

          if (questions.length > 0) {
            const questionIds = questions.map((q) => q.id);

            // Soft delete question options
            await tx.question_options.updateMany({
              where: { question_id: { in: questionIds } },
              data: { deleted: true, updated_at: new Date() },
            });

            // Soft delete questions
            await tx.questions.updateMany({
              where: { exercise_id: { in: exerciseIds } },
              data: { deleted: true, updated_at: new Date() },
            });
          }

          // Soft delete exercises
          await tx.exercises.updateMany({
            where: { test_section_id: { in: sectionIds } },
            data: { deleted: true, updated_at: new Date() },
          });
        }

        // Soft delete test sections
        await tx.test_sections.updateMany({
          where: { mock_test_id: id },
          data: { deleted: true, updated_at: new Date() },
        });
      }

      // Soft delete mock test
      await tx.mock_tests.update({
        where: { id },
        data: { deleted: true, updated_at: new Date() },
      });
    });

    this.logger.log(`Deleted mock test: ${id}`);
  }

  /**
   * Get Mock Test Statistics
   */
  async getStatistics(): Promise<{
    total_tests: number;
    by_type: Record<string, number>;
    by_level: Record<string, number>;
    active_tests: number;
  }> {
    const [totalTests, byType, byLevel, activeTests] = await Promise.all([
      this.prisma.mock_tests.count({
        where: { deleted: false },
      }),
      this.prisma.mock_tests.groupBy({
        by: ['test_type'],
        where: { deleted: false },
        _count: { id: true },
      }),
      this.prisma.mock_tests.groupBy({
        by: ['difficulty_level'],
        where: { deleted: false },
        _count: { id: true },
      }),
      this.prisma.mock_tests.count({
        where: { deleted: false },
      }),
    ]);

    return {
      total_tests: totalTests,
      by_type: byType.reduce(
        (acc, item) => ({
          ...acc,
          [item.test_type || 'unknown']: item._count.id,
        }),
        {},
      ),
      by_level: byLevel.reduce(
        (acc, item) => ({
          ...acc,
          [item.difficulty_level || 'unknown']: item._count.id,
        }),
        {},
      ),
      active_tests: activeTests,
    };
  }

  // Services methods (for learner) include: start test, fetching test details without is correct answers, submitting test results, getting test result, get test history, etc.

  /**
   * Start Mock Test
   */
  async startTest(testId: string, userId: string) {
    const test = await this.prisma.mock_tests.findUnique({
      where: { id: testId, deleted: false },
      include: {
        test_sections: {
          where: { deleted: false },
          include: {
            exercises: {
              where: { deleted: false },
              include: {
                question_groups: {
                  where: { deleted: false },
                  include: {
                    questions: {
                      where: { deleted: false },
                      include: {
                        question_options: {
                          where: { deleted: false },
                          // Exclude is_correct field when sending to learner
                          select: {
                            id: true,
                            option_text: true,
                            ordering: true,
                          },
                        },
                      },
                    },
                    matching_options: {
                      where: { deleted: false },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Create test result record
    const testResult = await this.prisma.test_results.create({
      data: {
        user_id: userId,
        mock_test_id: testId,
        status: MOCK_TEST_RESULT_STATUS.IN_PROGRESS,
      },
      include: {
        mock_tests: {
          include: {
            test_sections: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        test_result_id: testResult.id,
        test: test,
        started_at: testResult.created_at,
      },
    };
  }

  /**
   * Get test result
   */
  async getTestResult(testResultId: string, userId: string) {
    const testResult = await this.prisma.test_results.findUnique({
      where: { id: testResultId, user_id: userId },
      include: {
        mock_tests: true,
        section_results: {
          include: {
            test_sections: {
              include: {
                exercises: {
                  include: {
                    question_groups: {
                      include: {
                        questions: {
                          include: {
                            question_options: true,
                          },
                        },
                        matching_options: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!testResult) {
      throw new NotFoundException('Test result not found');
    }

    return {
      success: true,
      data: testResult,
    };
  }

  /**
   * Get user test history
   */
  async getUserTestHistory(
    userId: string,
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    const whereCondition: Prisma.test_resultsWhereInput = {
      deleted: false,
      ...this.utilsService.buildWhereFromQuery(rawQuery),
    };

    return this.utilsService.paginate<
      Prisma.test_resultsWhereInput,
      Prisma.test_resultsInclude,
      Prisma.test_resultsSelect,
      Prisma.test_resultsOrderByWithRelationInput
    >({
      model: this.prisma.test_results,
      query,
      defaultOrderBy: { created_at: 'asc' },
      select: {
        id: true,
        status: true,
        overall_score: true,
        time_taken: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  /**
   * Submit Test
   */

  // ======= PRIVATE HELPER METHODS =======

  private validateTestSections(
    testType: TestType,
    sections?: TestSection[],
  ): void {
    if (!sections || sections.length === 0) return;

    const sectionTypes = sections.map((s) => s.section_type);
    const requiredSections = this.getRequiredSections(testType);

    if (testType === TEST_TYPE.FULL_TEST) {
      // Full test should have all 4 sections
      const missing = requiredSections.filter(
        (type) => !sectionTypes.includes(type),
      );
      if (missing.length > 0) {
        throw new BadRequestException(
          `Full test missing required sections: ${missing.join(', ')}`,
        );
      }
    } else {
      // Single skill test should only have that section
      const invalid = sectionTypes.filter((type) => type !== testType);
      if (invalid.length > 0) {
        throw new BadRequestException(
          `${testType} test should only contain ${testType} sections`,
        );
      }
    }
  }

  private getRequiredSections(testType: TestType): TestType[] {
    if (testType === TEST_TYPE.FULL_TEST) {
      return [
        TEST_TYPE.READING,
        TEST_TYPE.WRITING,
        TEST_TYPE.LISTENING,
        TEST_TYPE.SPEAKING,
      ];
    }
    return [testType];
  }

  private getDefaultTimeLimit(testType: TestType): number {
    const timeLimits = {
      [TEST_TYPE.READING]: 60,
      [TEST_TYPE.WRITING]: 60,
      [TEST_TYPE.LISTENING]: 30,
      [TEST_TYPE.SPEAKING]: 15,
      [TEST_TYPE.FULL_TEST]: 165, // 60 + 60 + 30 + 15
    };
    return timeLimits[testType] || 60;
  }

  private getDefaultSectionTimeLimit(sectionType: SectionType): number {
    const timeLimits: Record<SectionType, number> = {
      [TEST_TYPE.READING]: 60,
      [TEST_TYPE.WRITING]: 60,
      [TEST_TYPE.LISTENING]: 30,
      [TEST_TYPE.SPEAKING]: 15,
    };
    const result = timeLimits[sectionType];
    return typeof result === 'number' ? result : 30;
  }

  private async createDefaultSections(
    tx: Prisma.TransactionClient,
    testId: string,
    testType: TestType,
  ): Promise<void> {
    const sections = this.getDefaultSectionsForTestType(testType);

    for (const [index, section] of sections.entries()) {
      await tx.test_sections.create({
        data: {
          mock_test_id: testId,
          section_name: section.name,
          section_type: section.type,
          duration: section.timeLimit,
          ordering: index + 1,
          description: section.instructions,
        },
      });
    }
  }

  private getDefaultSectionsForTestType(testType: TestType): Array<{
    name: string;
    type: TestType;
    timeLimit: number;
    instructions: string;
  }> {
    const sectionTemplates = {
      [TEST_TYPE.READING]: [
        {
          name: 'Reading Section',
          type: TEST_TYPE.READING,
          timeLimit: 60,
          instructions:
            'You should spend about 60 minutes on this section. Read the passages and answer the questions.',
        },
      ],
      [TEST_TYPE.WRITING]: [
        {
          name: 'Writing Section',
          type: TEST_TYPE.WRITING,
          timeLimit: 60,
          instructions:
            'You should spend about 60 minutes on this section. Complete both writing tasks.',
        },
      ],
      [TEST_TYPE.LISTENING]: [
        {
          name: 'Listening Section',
          type: TEST_TYPE.LISTENING,
          timeLimit: 30,
          instructions:
            'You will hear a number of different recordings and answer questions. Listen carefully as you will hear each recording only once.',
        },
      ],
      [TEST_TYPE.SPEAKING]: [
        {
          name: 'Speaking Section',
          type: TEST_TYPE.SPEAKING,
          timeLimit: 15,
          instructions:
            'The speaking test consists of three parts. You will be recorded throughout.',
        },
      ],
      [TEST_TYPE.FULL_TEST]: [
        {
          name: 'Reading Section',
          type: TEST_TYPE.READING,
          timeLimit: 60,
          instructions:
            'You should spend about 60 minutes on this section. Read the passages and answer the questions.',
        },
        {
          name: 'Writing Section',
          type: TEST_TYPE.WRITING,
          timeLimit: 60,
          instructions:
            'You should spend about 60 minutes on this section. Complete both writing tasks.',
        },
        {
          name: 'Listening Section',
          type: TEST_TYPE.LISTENING,
          timeLimit: 30,
          instructions:
            'You will hear a number of different recordings and answer questions. Listen carefully as you will hear each recording only once.',
        },
        {
          name: 'Speaking Section',
          type: TEST_TYPE.SPEAKING,
          timeLimit: 15,
          instructions:
            'The speaking test consists of three parts. You will be recorded throughout.',
        },
      ],
    };

    return sectionTemplates[testType] || [];
  }
}
