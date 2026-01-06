import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilesService } from 'src/modules/files/files.service';
import { GradingService } from 'src/modules/grading/grading.service';
import { UserAnswer } from 'src/modules/grading/types/grading.types';
import { MailService } from 'src/modules/mail/mail.service';
import {
  MOCK_TEST_RESULT_STATUS,
  SectionType,
  TEST_TYPE,
  TestType,
} from 'src/modules/mock-tests/constants';
import {
  SpeakingPart,
  TranscribeAndGradeDto,
} from 'src/modules/speaking/dto/grade-speaking.dto';
import { SpeakingService } from 'src/modules/speaking/speaking.service';
import {
  GradeWritingDto,
  WritingTaskType,
} from 'src/modules/writing/dto/grade-writing.dto';
import { WritingService } from 'src/modules/writing/writing.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import {
  CreateMockTestDto,
  TestSectionSubmissionDto,
  UserAnswerSubmissionDto,
} from './dto/create-mock-test.dto';
import { UpdateMockTestDto } from './dto/update-mock-test.dto';

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
    private readonly gradingService: GradingService,
    private readonly speakingService: SpeakingService,
    private readonly filesService: FilesService,
    private readonly writingService: WritingService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create Mock Test with Sections
   */
  async create(createDto: CreateMockTestDto) {
    // Kiểm tra xem bài kiểm tra với tiêu đề giống nhau có tồn tại không
    const existingTest = await this.prisma.mock_tests.findFirst({
      where: {
        title: createDto.title,
        deleted: false,
      },
    });

    if (existingTest) {
      throw new ConflictException('Mock test with this title already exists');
    }

    // Xác thực các phần cho loại bài kiểm tra
    this.validateTestSections(
      createDto.test_type as unknown as SectionType,
      createDto.test_sections,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Tạo bài kiểm tra mock
      const mockTest = await tx.mock_tests.create({
        data: {
          title: createDto.title,
          test_type: createDto.test_type,
          description: createDto.description,
          instructions: createDto.instructions,
          duration:
            createDto.duration || this.getDefaultTimeLimit(createDto.test_type),
          difficulty_level: createDto.difficulty_level || 'intermediate',
        },
      });

      // Tạo các phần kiểm tra nếu được cung cấp
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
              description: sectionDto.description,
            },
          });
        }
      } else {
        // Tạo các phần mặc định dựa trên loại bài kiểm tra
        await this.createDefaultSections(tx, mockTest.id, createDto.test_type);
      }

      this.logger.log(`Created mock test: ${mockTest.title}`);

      // Trả về với các thông tin liên kết
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

    return this.utilsService.paginate({
      model: this.prisma.mock_tests,
      query,
      defaultOrderBy: { created_at: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        test_type: true,
        duration: true,
        difficulty_level: true,
        target_band_score: true,
        total_questions: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  /**
   * Get Mock Test by ID
   */
  async findOne(id: string) {
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
                question_groups: {
                  where: { deleted: false },
                  include: {
                    questions: {
                      where: { deleted: false },
                      include: {
                        question_options: {
                          where: { deleted: false },
                        },
                      },
                    },
                    matching_options: {
                      where: { deleted: false },
                    },
                  },
                  orderBy: { ordering: 'asc' },
                },
              },
              orderBy: { ordering: 'asc' },
            },
          },
          orderBy: { ordering: 'asc' },
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
  async update(id: string, updateDto: UpdateMockTestDto) {
    const existingTest = await this.prisma.mock_tests.findFirst({
      where: { id, deleted: false },
    });

    if (!existingTest) {
      throw new NotFoundException('Mock test not found');
    }

    // Kiểm tra xung đột tiêu đề nếu đang cập nhật
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
          difficulty_level: updateDto.difficulty_level,
          duration: updateDto.duration || existingTest.duration,
          status: updateDto.status,
          updated_at: new Date(),
        },
      });

      // cập nhật các phần kiểm tra nếu được cung cấp
      if (updateDto.test_sections && updateDto.test_sections.length > 0) {
        const sectionIdsToKeep = updateDto.test_sections
          .map((s) => s.section_id)
          .filter((id): id is string => typeof id === 'string');

        // Xóa mềm các phần không có trong danh sách cập nhật
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
            // Cập nhật phần hiện tại
            await tx.test_sections.update({
              where: { id: sectionDto.section_id },
              data: {
                section_name: sectionDto.section_name,
                section_type: sectionDto.section_type,
                duration:
                  sectionDto.duration ||
                  this.getDefaultSectionTimeLimit(sectionDto.section_type),
                ordering: sectionDto.ordering ?? index + 1,
                description: sectionDto.description,
                updated_at: new Date(),
              },
            });
          } else {
            // Tạo phần mới
            await tx.test_sections.create({
              data: {
                mock_test_id: id,
                section_name: sectionDto.section_name,
                section_type: sectionDto.section_type,
                duration:
                  sectionDto.duration ||
                  this.getDefaultSectionTimeLimit(sectionDto.section_type),
                ordering: sectionDto.ordering ?? index + 1,
                description: sectionDto.description,
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
      // Lấy tất cả các phần kiểm tra
      const testSections = await tx.test_sections.findMany({
        where: { mock_test_id: id, deleted: false },
        select: { id: true },
      });

      if (testSections.length > 0) {
        const sectionIds = testSections.map((s) => s.id);

        // Lấy tất cả các bài tập
        const exercises = await tx.exercises.findMany({
          where: { test_section_id: { in: sectionIds }, deleted: false },
          select: { id: true },
        });

        if (exercises.length > 0) {
          const exerciseIds = exercises.map((e) => e.id);

          // Lấy tất cả các câu hỏi
          const questions = await tx.questions.findMany({
            where: { exercise_id: { in: exerciseIds }, deleted: false },
            select: { id: true },
          });

          if (questions.length > 0) {
            const questionIds = questions.map((q) => q.id);

            // Xóa mềm các tùy chọn câu hỏi
            await tx.question_options.updateMany({
              where: { question_id: { in: questionIds } },
              data: { deleted: true, updated_at: new Date() },
            });

            // Xóa mềm các câu hỏi
            await tx.questions.updateMany({
              where: { exercise_id: { in: exerciseIds } },
              data: { deleted: true, updated_at: new Date() },
            });
          }

          // Xóa mềm các bài tập
          await tx.exercises.updateMany({
            where: { test_section_id: { in: sectionIds } },
            data: { deleted: true, updated_at: new Date() },
          });
        }

        // Xóa mềm các phần kiểm tra
        await tx.test_sections.updateMany({
          where: { mock_test_id: id },
          data: { deleted: true, updated_at: new Date() },
        });
      }

      // Xóa mềm bài kiểm tra mock
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
                          // Loại trường is_correct khi gửi cho người học
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

    // Tạo bản ghi kết quả kiểm tra
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
  async getTestResultById(testResultId: string, userId: string) {
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
   * Get detailed test result with review (correct/incorrect answers mapped to questions)
   */
  async getTestResultReview(testResultId: string, userId: string) {
    const testResult = await this.prisma.test_results.findUnique({
      where: { id: testResultId, user_id: userId },
      include: {
        mock_tests: {
          select: {
            id: true,
            title: true,
            description: true,
            test_type: true,
            duration: true,
          },
        },
        section_results: {
          where: { deleted: false },
          include: {
            test_sections: {
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
                              orderBy: { ordering: 'asc' },
                            },
                          },
                          orderBy: { ordering: 'asc' },
                        },
                        matching_options: {
                          where: { deleted: false },
                          orderBy: { ordering: 'asc' },
                        },
                      },
                      orderBy: { ordering: 'asc' },
                    },
                  },
                  orderBy: { ordering: 'asc' },
                },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!testResult) {
      throw new NotFoundException('Test result not found');
    }

    // Map detailed_answers to questions for each section
    const sectionResultsWithReview = testResult.section_results.map(
      (sectionResult) => {
        const detailedAnswers = sectionResult.detailed_answers as any;
        const questionsMap = new Map<string, any>();

        // Build questions map from exercises
        if (sectionResult.test_sections?.exercises) {
          sectionResult.test_sections.exercises.forEach((exercise) => {
            exercise.question_groups?.forEach((group) => {
              group.questions?.forEach((question) => {
                questionsMap.set(question.id, {
                  ...question,
                  question_group: group,
                  exercise: exercise,
                });
              });
            });
          });
        }

        // Map detailed answers to questions
        let questionReviews: any[] = [];

        if (detailedAnswers) {
          // Handle different structures of detailed_answers
          if (Array.isArray(detailedAnswers)) {
            // Standard format: array of GradingResult
            questionReviews = detailedAnswers.map((result: any) => {
              const question = questionsMap.get(result.question_id);
              return {
                question_id: result.question_id,
                question: question || null,
                is_correct: result.is_correct || false,
                user_answer: result.user_answer || null,
                correct_answer: result.correct_answer || null,
                points_earned: result.points_earned || 0,
                max_points: result.max_points || 1,
                explanation: question?.explanation || null,
              };
            });
          } else if (detailedAnswers.all_questions) {
            // Speaking format: { all_questions: [...], part_scores: {...} }
            questionReviews = detailedAnswers.all_questions.map(
              (result: any) => {
                const question = questionsMap.get(result.question_id);
                return {
                  question_id: result.question_id,
                  question: question || null,
                  is_correct: result.is_correct || false,
                  user_answer: result.user_answer || null,
                  correct_answer: result.correct_answer || null,
                  points_earned: result.points_earned || 0,
                  max_points: result.max_points || 1,
                  explanation: question?.explanation || null,
                  part: result.part || null,
                  ai_feedback: result.ai_feedback || null,
                };
              },
            );
          } else if (detailedAnswers.tasks) {
            // Writing format: { tasks: [{ task_type, question_id, ... }] }
            questionReviews = detailedAnswers.tasks.map((task: any) => {
              const question = questionsMap.get(task.question_id);
              return {
                question_id: task.question_id,
                question: question || null,
                task_type: task.task_type,
                user_answer: task.student_answer || null,
                overall_score: task.overall_score || null,
                task_achievement_score: task.task_achievement_score || null,
                coherence_cohesion_score: task.coherence_cohesion_score || null,
                lexical_resource_score: task.lexical_resource_score || null,
                grammatical_range_accuracy_score:
                  task.grammatical_range_accuracy_score || null,
                detailed_feedback: task.detailed_feedback || null,
                suggestions: task.suggestions || null,
                strengths: task.strengths || null,
                weaknesses: task.weaknesses || null,
              };
            });
          }
        }

        // If no detailed answers but questions exist, create empty reviews
        if (questionReviews.length === 0 && questionsMap.size > 0) {
          questionReviews = Array.from(questionsMap.values()).map(
            (question) => ({
              question_id: question.id,
              question: question,
              is_correct: null,
              user_answer: null,
              correct_answer: null,
              points_earned: 0,
              max_points: Number(question.points) || 1,
              explanation: question.explanation || null,
            }),
          );
        }

        return {
          ...sectionResult,
          question_reviews: questionReviews,
        };
      },
    );

    return {
      success: true,
      data: {
        ...testResult,
        section_results: sectionResultsWithReview,
      },
    };
  }

  /**
   * Save writing submission for teacher grading (without AI grading)
   */
  private async saveWritingForTeacherGrading(
    answers: TestSectionSubmissionDto,
    testResult: any,
    testSection: any,
    questions: any[],
    essayAnswers: Record<string, string>,
  ) {
    // Prepare detailed answers structure with student answers only
    const detailedAnswers: any = {
      tasks: [],
    };

    // Identify Task 1 and Task 2 (similar logic to AI grading)
    let task1Question: any = null;
    let task2Question: any = null;
    let task1Answer = '';
    let task2Answer = '';

    const questionMap = new Map<string, any>();
    for (const question of questions) {
      questionMap.set(question.id, question);
    }

    // Identify tasks based on keywords and ordering
    for (const question of questions) {
      const answer = essayAnswers[question.id] || '';
      if (!answer || answer.trim().length === 0) {
        continue;
      }

      const isTask1 =
        question.question_groups?.[0]?.group_title
          ?.toLowerCase()
          .includes('task 1') ||
        question.question_groups?.[0]?.group_title
          ?.toLowerCase()
          .includes('task1') ||
        question.question_text?.toLowerCase().includes('task 1') ||
        question.question_text?.toLowerCase().includes('150') ||
        question.question_text?.toLowerCase().includes('chart') ||
        question.question_text?.toLowerCase().includes('graph') ||
        question.question_text?.toLowerCase().includes('table') ||
        question.question_text?.toLowerCase().includes('diagram');

      if (isTask1 && !task1Question) {
        task1Question = question;
        task1Answer = answer;
      } else if (!isTask1 && !task2Question) {
        task2Question = question;
        task2Answer = answer;
      }
    }

    // Fallback to ordering if not identified
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = essayAnswers[question.id] || '';
      if (!answer || answer.trim().length === 0) {
        continue;
      }

      if (!task1Question && i === 0) {
        task1Question = question;
        task1Answer = answer;
      } else if (!task2Question && i === 1) {
        task2Question = question;
        task2Answer = answer;
      }
    }

    // Build tasks array
    if (task1Question && task1Answer.trim().length > 0) {
      const questionText =
        task1Question.question_text ||
        task1Question.question_groups?.[0]?.group_instruction ||
        'Writing Task 1';

      let imageUrl: string | undefined = undefined;
      if (task1Question.exercises?.content) {
        try {
          const exerciseContent =
            typeof task1Question.exercises.content === 'string'
              ? JSON.parse(task1Question.exercises.content)
              : task1Question.exercises.content;
          imageUrl =
            exerciseContent.questionImage ||
            exerciseContent.chart_url ||
            exerciseContent.image_url ||
            undefined;
        } catch (e) {
          this.logger.warn(`Failed to parse exercise content: ${e}`);
        }
      }

      // Fallback to question_group or question image_url
      if (!imageUrl) {
        imageUrl =
          task1Question.question_groups?.[0]?.image_url ||
          task1Question.image_url ||
          undefined;
      }

      detailedAnswers.tasks.push({
        task_type: 'task_1',
        question_id: task1Question.id,
        question_text: questionText,
        student_answer: task1Answer,
        image_url: imageUrl,
        word_count: task1Answer.trim().split(/\s+/).length,
      });
    }

    if (task2Question && task2Answer.trim().length > 0) {
      const questionText =
        task2Question.question_text ||
        task2Question.question_groups?.[0]?.group_instruction ||
        'Writing Task 2';

      detailedAnswers.tasks.push({
        task_type: 'task_2',
        question_id: task2Question.id,
        question_text: questionText,
        student_answer: task2Answer,
        word_count: task2Answer.trim().split(/\s+/).length,
      });
    }

    // Save section result without grading (graded_at = null, grading_method = 'teacher')
    this.logger.log(
      `Saving writing for teacher grading - testSection: ${JSON.stringify({
        id: testSection.id,
        section_type: testSection.section_type,
        section_name: testSection.section_name || testSection.name,
        deleted: testSection.deleted,
      })}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      const created = await tx.section_results.create({
        data: {
          test_result_id: testResult.id,
          test_section_id: testSection.id,
          band_score: null, // Will be set by teacher
          time_taken: answers.time_taken,
          correct_answers: null,
          total_questions: questions.length,
          detailed_answers: this.serializeToJson(detailedAnswers),
          grading_method: 'teacher',
          graded_at: null, // Not graded yet
          graded_by: null, // Will be set when teacher grades
        },
      });

      this.logger.log(
        `Saved writing section for teacher grading: section_result_id=${created.id}, test_result_id=${testResult.id}, test_section_id=${testSection.id}, grading_method=${created.grading_method}, graded_at=${created.graded_at}`,
      );

      return {
        success: true,
        data: {
          message:
            'Your writing has been submitted for teacher grading. You will receive an email notification when grading is complete.',
          band_score: null,
          correct_answers: null,
          total_questions: questions.length,
          grading_method: 'teacher',
          graded_at: null,
        },
      };
    });
  }

  /**
   * Save speaking section for teacher grading (without AI grading)
   */
  private async saveSpeakingForTeacherGrading(
    answers: TestSectionSubmissionDto,
    testResult: any,
    testSection: any,
  ) {
    const audioData = answers.speaking_audio_data || [];

    // Get questions from DB to retrieve question details
    const questionIds = audioData.map((item) => item.question_id);
    const questionsFromDb = await this.prisma.questions.findMany({
      where: {
        id: { in: questionIds },
        deleted: false,
      },
      include: {
        question_groups: {
          select: {
            id: true,
            group_instruction: true,
            group_title: true,
          },
        },
        exercises: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    // Prepare detailed answers structure with student audio data only
    const detailedAnswers: any = {
      all_questions: audioData.map((audioItem) => {
        const questionFromDb = questionsFromDb.find(
          (q) => q.id === audioItem.question_id,
        );
        const questionText =
          audioItem.question_text ||
          questionFromDb?.question_text ||
          questionFromDb?.question_groups?.[0]?.group_instruction ||
          'Speaking question';

        // Determine part type (similar logic to AI grading)
        let partType = 'part_1';
        if (questionFromDb?.exercises?.content) {
          try {
            const exerciseContent =
              typeof questionFromDb.exercises.content === 'string'
                ? JSON.parse(questionFromDb.exercises.content)
                : questionFromDb.exercises.content;
            const contentPartType =
              exerciseContent.partType || exerciseContent.part_type;
            if (contentPartType) {
              partType = contentPartType;
            }
          } catch (e) {
            this.logger.warn(
              `Failed to parse exercise content for part type: ${e}`,
            );
          }
        }

        // Fallback to question_group title
        if (
          partType === 'part_1' &&
          questionFromDb?.question_groups?.[0]?.group_title
        ) {
          const groupTitle =
            questionFromDb.question_groups[0].group_title.toLowerCase();
          if (
            groupTitle.includes('part 2') ||
            groupTitle.includes('part2') ||
            groupTitle.includes('long turn')
          ) {
            partType = 'part_2';
          } else if (
            groupTitle.includes('part 3') ||
            groupTitle.includes('part3') ||
            groupTitle.includes('discussion')
          ) {
            partType = 'part_3';
          }
        }

        return {
          question_id: audioItem.question_id,
          question_text: questionText,
          audio_url: audioItem.audio_url,
          part_type: partType,
        };
      }),
    };

    // Save section result without grading (graded_at = null, grading_method = 'teacher')
    this.logger.log(
      `Saving speaking for teacher grading - testSection: ${JSON.stringify({
        id: testSection.id,
        section_type: testSection.section_type,
        section_name: testSection.section_name || testSection.name,
        deleted: testSection.deleted,
      })}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      const created = await tx.section_results.create({
        data: {
          test_result_id: testResult.id,
          test_section_id: testSection.id,
          band_score: null, // Will be set by teacher
          time_taken: answers.time_taken,
          correct_answers: null,
          total_questions: audioData.length,
          detailed_answers: this.serializeToJson(detailedAnswers),
          grading_method: 'teacher',
          graded_at: null, // Not graded yet
          graded_by: null, // Will be set when teacher grades
        },
      });

      this.logger.log(
        `Saved speaking section for teacher grading: section_result_id=${created.id}, test_result_id=${testResult.id}, test_section_id=${testSection.id}, grading_method=${created.grading_method}, graded_at=${created.graded_at}`,
      );

      return {
        success: true,
        data: {
          message:
            'Your speaking has been submitted for teacher grading. You will receive an email notification when grading is complete.',
          band_score: null,
          correct_answers: null,
          total_questions: audioData.length,
          grading_method: 'teacher',
          graded_at: null,
        },
      };
    });
  }

  /**
   * Get pending writing submissions for teacher grading
   */
  async getPendingWritingSubmissions(
    teacherId: string,
    query: PaginationQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // First, let's check all pending submissions without section_type filter
    const allPending = await this.prisma.section_results.findMany({
      where: {
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
      },
      include: {
        test_sections: {
          select: {
            id: true,
            section_name: true,
            section_type: true,
            deleted: true,
          },
        },
      },
      take: 10,
    });

    this.logger.log(
      `Found ${allPending.length} pending submissions (all types). Details: ${JSON.stringify(
        allPending.map((s) => ({
          id: s.id,
          section_type: s.test_sections?.section_type,
          section_deleted: s.test_sections?.deleted,
        })),
      )}`,
    );

    // Try querying without the deleted filter on test_sections first to see if that's the issue
    const pendingSubmissions = await this.prisma.section_results.findMany({
      where: {
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
        test_sections: {
          section_type: 'writing',
          // Removed deleted: false filter temporarily to debug
        },
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
        test_sections: {
          select: {
            id: true,
            section_name: true,
            section_type: true,
            duration: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.section_results.count({
      where: {
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
        test_sections: {
          section_type: 'writing',
          // Removed deleted: false filter temporarily to debug
        },
      },
    });

    this.logger.log(
      `Found ${pendingSubmissions.length} writing submissions pending grading (total: ${total})`,
    );

    return {
      success: true,
      data: {
        items: pendingSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get graded writing submissions for teacher review
   */
  async getGradedWritingSubmissions(
    teacherId: string,
    query: PaginationQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const gradedSubmissions = await this.prisma.section_results.findMany({
      where: {
        grading_method: 'teacher',
        graded_at: { not: null }, // Only graded submissions
        deleted: false,
        test_sections: {
          section_type: 'writing',
        },
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
        test_sections: {
          select: {
            id: true,
            section_name: true,
            section_type: true,
            duration: true,
          },
        },
        users: {
          // The teacher who graded
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        graded_at: 'desc', // Most recently graded first
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.section_results.count({
      where: {
        grading_method: 'teacher',
        graded_at: { not: null },
        deleted: false,
        test_sections: {
          section_type: 'writing',
        },
      },
    });

    this.logger.log(
      `Found ${gradedSubmissions.length} graded writing submissions (total: ${total})`,
    );

    return {
      success: true,
      data: {
        items: gradedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get writing submission details for grading
   */
  async getWritingSubmissionForGrading(
    sectionResultId: string,
    _teacherId: string, // Reserved for future use (e.g., permission checks)
  ) {
    // Allow viewing both pending and graded submissions
    // Use findFirst because we have multiple conditions
    const sectionResult = await this.prisma.section_results.findFirst({
      where: {
        id: sectionResultId,
        grading_method: 'teacher',
        // Removed graded_at: null filter to allow viewing graded submissions
        deleted: false,
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
                duration: true,
              },
            },
          },
        },
        test_sections: {
          include: {
            exercises: {
              where: { deleted: false },
              include: {
                question_groups: {
                  where: { deleted: false },
                  include: {
                    questions: {
                      where: { deleted: false },
                      orderBy: { ordering: 'asc' },
                    },
                  },
                  orderBy: { ordering: 'asc' },
                },
              },
              orderBy: { ordering: 'asc' },
            },
          },
        },
      },
    });

    if (!sectionResult) {
      throw new NotFoundException(
        'Writing submission not found or already graded',
      );
    }

    return {
      success: true,
      data: sectionResult,
    };
  }

  /**
   * Submit teacher grading for writing submission
   */
  async submitWritingGrading(
    sectionResultId: string,
    gradingDto: any,
    userId: string, // This is user.id, which is now directly used for graded_by
  ) {
    // Verify user is a teacher
    const user = await this.prisma.users.findUnique({
      where: {
        id: userId,
        deleted: false,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'teacher') {
      throw new BadRequestException(
        'Only teachers can grade writing submissions',
      );
    }

    this.logger.log(
      `Teacher ${userId} submitting grading for ${sectionResultId}`,
    );

    // First, check if section_result exists at all
    const existingSectionResult = await this.prisma.section_results.findUnique({
      where: { id: sectionResultId },
      select: {
        id: true,
        grading_method: true,
        graded_at: true,
        deleted: true,
        test_sections: {
          select: {
            section_type: true,
          },
        },
      },
    });

    this.logger.log(
      `Existing section_result: ${JSON.stringify({
        id: existingSectionResult?.id,
        grading_method: existingSectionResult?.grading_method,
        graded_at: existingSectionResult?.graded_at,
        deleted: existingSectionResult?.deleted,
        section_type: existingSectionResult?.test_sections?.section_type,
      })}`,
    );

    const sectionResult = await this.prisma.section_results.findFirst({
      where: {
        id: sectionResultId,
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
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

    if (!sectionResult) {
      throw new NotFoundException(
        'Writing submission not found or already graded',
      );
    }

    const detailedAnswers = sectionResult.detailed_answers as any;
    const tasks = detailedAnswers?.tasks || [];

    // Calculate overall band score from task scores
    let overallBandScore = 0;
    if (gradingDto.task1_score && gradingDto.task2_score) {
      // Task 2 = 2/3 weight, Task 1 = 1/3 weight
      overallBandScore =
        (gradingDto.task1_score * 1 + gradingDto.task2_score * 2) / 3;
    } else if (gradingDto.task2_score) {
      overallBandScore = gradingDto.task2_score;
    } else if (gradingDto.task1_score) {
      overallBandScore = gradingDto.task1_score;
    }

    // Round to nearest 0.5
    overallBandScore = Math.round(overallBandScore * 2) / 2;

    // Update detailed_answers with teacher scores and feedback
    const updatedDetailedAnswers = {
      ...detailedAnswers,
      overallScore: overallBandScore,
      tasks: tasks.map((task: any) => {
        if (task.task_type === 'task_1') {
          return {
            ...task,
            overall_score: gradingDto.task1_score || null,
            task_achievement_score: gradingDto.task1_task_achievement || null,
            coherence_cohesion_score:
              gradingDto.task1_coherence_cohesion || null,
            lexical_resource_score: gradingDto.task1_lexical_resource || null,
            grammatical_range_accuracy_score:
              gradingDto.task1_grammatical_range_accuracy || null,
            detailed_feedback: gradingDto.task1_feedback || null,
          };
        } else if (task.task_type === 'task_2') {
          return {
            ...task,
            overall_score: gradingDto.task2_score || null,
            task_achievement_score: gradingDto.task2_task_achievement || null,
            coherence_cohesion_score:
              gradingDto.task2_coherence_cohesion || null,
            lexical_resource_score: gradingDto.task2_lexical_resource || null,
            grammatical_range_accuracy_score:
              gradingDto.task2_grammatical_range_accuracy || null,
            detailed_feedback: gradingDto.task2_feedback || null,
          };
        }
        return task;
      }),
      teacher_feedback: gradingDto.general_feedback || null,
    };

    // Update section result and test result
    this.logger.log(
      `Submitting teacher grading for ${sectionResultId}: task1_score=${gradingDto.task1_score}, task2_score=${gradingDto.task2_score}, overallBandScore=${overallBandScore}`,
    );
    this.logger.log(
      `Updated detailed_answers structure: ${JSON.stringify(updatedDetailedAnswers, null, 2)}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Update section result
      const updatedSectionResult = await tx.section_results.update({
        where: { id: sectionResultId },
        data: {
          band_score: overallBandScore,
          teacher_score: overallBandScore,
          teacher_feedback: gradingDto.general_feedback || null,
          detailed_answers: this.serializeToJson(updatedDetailedAnswers),
          grading_method: 'teacher',
          graded_by: userId, // Now using user.id directly
          graded_at: new Date(),
          updated_at: new Date(),
        },
      });

      this.logger.log(
        `Successfully updated section_result ${sectionResultId}: band_score=${updatedSectionResult.band_score}, graded_by=${updatedSectionResult.graded_by}, graded_at=${updatedSectionResult.graded_at}`,
      );

      // Update test result writing score and overall band score
      const testResult = sectionResult.test_results;
      if (!testResult) {
        throw new NotFoundException('Test result not found');
      }

      const overallTestScore = this.gradingService.calculateOverallTestScore(
        Number(testResult.reading_score) || null,
        Number(testResult.listening_score) || null,
        overallBandScore,
        Number(testResult.speaking_score) || null,
      );

      await tx.test_results.update({
        where: { id: testResult.id },
        data: {
          writing_score: overallBandScore,
          band_score: overallTestScore,
          updated_at: new Date(),
        },
      });

      // Send email notification to student
      try {
        await this.mailService.sendWritingGradingComplete({
          to: testResult.users?.email || '',
          userName: testResult.users?.full_name || 'Student',
          testTitle: testResult.mock_tests?.title || 'Mock Test',
          bandScore: overallBandScore,
          testResultId: testResult.id,
        });
      } catch (error) {
        this.logger.error(`Failed to send email notification: ${error}`);
        // Don't fail the grading if email fails
      }

      this.logger.log(
        `Teacher ${userId} graded writing submission ${sectionResultId} with score ${overallBandScore}`,
      );

      return {
        success: true,
        data: {
          ...updatedSectionResult,
          message:
            'Grading submitted successfully. Student has been notified via email.',
        },
      };
    });
  }

  /**
   * Get pending speaking submissions for teacher grading
   */
  async getPendingSpeakingSubmissions(
    teacherId: string,
    query: PaginationQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const pendingSubmissions = await this.prisma.section_results.findMany({
      where: {
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
        test_sections: {
          section_type: 'speaking',
        },
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
        test_sections: {
          select: {
            id: true,
            section_name: true,
            section_type: true,
            duration: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.section_results.count({
      where: {
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
        test_sections: {
          section_type: 'speaking',
        },
      },
    });

    this.logger.log(
      `Found ${pendingSubmissions.length} speaking submissions pending grading (total: ${total})`,
    );

    return {
      success: true,
      data: {
        items: pendingSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get graded speaking submissions for teacher review
   */
  async getGradedSpeakingSubmissions(
    teacherId: string,
    query: PaginationQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const gradedSubmissions = await this.prisma.section_results.findMany({
      where: {
        grading_method: 'teacher',
        graded_at: { not: null },
        deleted: false,
        test_sections: {
          section_type: 'speaking',
        },
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
              },
            },
          },
        },
        test_sections: {
          select: {
            id: true,
            section_name: true,
            section_type: true,
            duration: true,
          },
        },
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        graded_at: 'desc',
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.section_results.count({
      where: {
        grading_method: 'teacher',
        graded_at: { not: null },
        deleted: false,
        test_sections: {
          section_type: 'speaking',
        },
      },
    });

    this.logger.log(
      `Found ${gradedSubmissions.length} graded speaking submissions (total: ${total})`,
    );

    return {
      success: true,
      data: {
        items: gradedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get speaking submission details for grading
   */
  async getSpeakingSubmissionForGrading(
    sectionResultId: string,
    _teacherId: string,
  ) {
    const sectionResult = await this.prisma.section_results.findFirst({
      where: {
        id: sectionResultId,
        grading_method: 'teacher',
        deleted: false,
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            mock_tests: {
              select: {
                id: true,
                title: true,
                test_type: true,
                duration: true,
              },
            },
          },
        },
        test_sections: {
          include: {
            exercises: {
              where: { deleted: false },
              include: {
                question_groups: {
                  where: { deleted: false },
                  include: {
                    questions: {
                      where: { deleted: false },
                      orderBy: { ordering: 'asc' },
                    },
                  },
                  orderBy: { ordering: 'asc' },
                },
              },
              orderBy: { ordering: 'asc' },
            },
          },
        },
      },
    });

    if (!sectionResult) {
      throw new NotFoundException(
        'Speaking submission not found',
      );
    }

    return {
      success: true,
      data: sectionResult,
    };
  }

  /**
   * Submit teacher grading for speaking submission
   */
  async submitSpeakingGrading(
    sectionResultId: string,
    gradingDto: any,
    userId: string,
  ) {
    // Verify user is a teacher
    const user = await this.prisma.users.findUnique({
      where: {
        id: userId,
        deleted: false,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'teacher') {
      throw new BadRequestException(
        'Only teachers can grade speaking submissions',
      );
    }

    this.logger.log(
      `Teacher ${userId} submitting grading for speaking ${sectionResultId}`,
    );

    const sectionResult = await this.prisma.section_results.findFirst({
      where: {
        id: sectionResultId,
        grading_method: 'teacher',
        graded_at: null,
        deleted: false,
      },
      include: {
        test_results: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
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

    if (!sectionResult) {
      throw new NotFoundException(
        'Speaking submission not found or already graded',
      );
    }

    const detailedAnswers = sectionResult.detailed_answers as any;
    const overallBandScore = gradingDto.overall_score || 0;

    // Round to nearest 0.5
    const roundedBandScore = Math.round(overallBandScore * 2) / 2;

    // Update detailed_answers with teacher scores and feedback
    const updatedDetailedAnswers = {
      ...detailedAnswers,
      overall_score: roundedBandScore,
      fluency_coherence: gradingDto.fluency_coherence || null,
      lexical_resource: gradingDto.lexical_resource || null,
      grammatical_range_accuracy: gradingDto.grammatical_range_accuracy || null,
      pronunciation: gradingDto.pronunciation || null,
      teacher_feedback: gradingDto.feedback || null,
    };

    this.logger.log(
      `Submitting teacher grading for speaking ${sectionResultId}: overall_score=${roundedBandScore}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // Update section result
      const updatedSectionResult = await tx.section_results.update({
        where: { id: sectionResultId },
        data: {
          band_score: roundedBandScore,
          teacher_score: roundedBandScore,
          teacher_feedback: gradingDto.feedback || null,
          detailed_answers: this.serializeToJson(updatedDetailedAnswers),
          grading_method: 'teacher',
          graded_by: userId,
          graded_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Update test result speaking score and overall band score
      const testResult = sectionResult.test_results;
      if (!testResult) {
        throw new NotFoundException('Test result not found');
      }

      const overallTestScore = this.gradingService.calculateOverallTestScore(
        Number(testResult.reading_score) || null,
        Number(testResult.listening_score) || null,
        Number(testResult.writing_score) || null,
        roundedBandScore,
      );

      await tx.test_results.update({
        where: { id: testResult.id },
        data: {
          speaking_score: roundedBandScore,
          band_score: overallTestScore,
          updated_at: new Date(),
        },
      });

      // Send email notification to student
      try {
        await this.mailService.sendSpeakingGradingComplete({
          to: testResult.users?.email || '',
          userName: testResult.users?.full_name || 'Student',
          testTitle: testResult.mock_tests?.title || 'Mock Test',
          bandScore: roundedBandScore,
          testResultId: testResult.id,
        });
      } catch (error) {
        this.logger.error(`Failed to send email notification: ${error}`);
        // Don't fail the grading if email fails
      }

      this.logger.log(
        `Teacher ${userId} graded speaking submission ${sectionResultId} with score ${roundedBandScore}`,
      );

      return {
        success: true,
        data: {
          ...updatedSectionResult,
          message:
            'Grading submitted successfully. Student has been notified via email.',
        },
      };
    });
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
      user_id: userId,
      deleted: false,
      ...this.utilsService.buildWhereFromQuery(rawQuery),
    };

    return this.utilsService.paginate({
      model: this.prisma.test_results,
      query,
      defaultOrderBy: { created_at: 'desc' },
      include: {
        mock_tests: {
          select: {
            id: true,
            title: true,
            test_type: true,
            duration: true,
          },
        },
        section_results: {
          where: { deleted: false },
          select: {
            id: true,
            band_score: true,
            correct_answers: true,
            total_questions: true,
            time_taken: true,
            grading_method: true,
            created_at: true,
            test_sections: {
              select: {
                id: true,
                section_name: true,
                section_type: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      where: whereCondition,
    });
  }

  /**
   * Submit each section result (for reading, listening, and speaking sections)
   */
  async submitSectionAnswers(
    answers: TestSectionSubmissionDto,
    userId: string,
  ) {
    // Validate test result ownership
    const testResult = await this.prisma.test_results.findUnique({
      where: { id: answers.test_result_id, user_id: userId },
    });

    if (!testResult) {
      throw new NotFoundException('Test result not found for this user');
    }

    // Validate section belongs to the test
    const testSection = await this.prisma.test_sections.findFirst({
      where: {
        id: answers.test_section_id,
        mock_test_id: testResult.mock_test_id,
        deleted: false,
      },
    });

    if (!testSection) {
      throw new NotFoundException('Test section not found for this test');
    }

    // Handle speaking section differently
    if (testSection.section_type === TEST_TYPE.SPEAKING) {
      return await this.submitSpeakingSection(answers, testResult, testSection);
    }

    // Handle writing section with AI grading
    if (testSection.section_type === TEST_TYPE.WRITING) {
      return await this.handleWritingSectionSubmission(
        answers,
        testResult,
        testSection,
      );
    }

    // find all questions in the section
    const questions = await this.prisma.questions.findMany({
      where: {
        exercises: {
          test_section_id: testSection.id,
          deleted: false,
        },
        deleted: false,
      },
      include: {
        question_options: true,
      },
    });

    // format question
    const formattedQuestions = questions.map((question) => {
      return {
        id: question.id,
        question_type: question.question_type,
        question_text: question.question_text,
        point: question.points ? Number(question.points) : 0,
        question_options: question.question_options.map((option) => ({
          id: option.id,
          option_text: option.option_text,
          matching_option_id: option.matching_option_id ?? undefined,
          is_correct: option.is_correct ?? false,
          point: option.point ? Number(option.point) : 0,
        })),
      };
    });

    // format user answers
    const userAnswers: Record<string, UserAnswer> = {};
    for (const answerDto of answers.answers) {
      userAnswers[answerDto.question_id] = this.getAnswer(
        answerDto.user_answer,
      );
    }

    const results = this.gradingService.gradeSection(
      formattedQuestions,
      userAnswers,
      testSection.section_type,
    );

    // Save section result and update test result
    return await this.prisma.$transaction(async (tx) => {
      // Save section result
      await tx.section_results.create({
        data: {
          test_result_id: testResult.id,
          test_section_id: testSection.id,
          band_score: results.band_score,
          time_taken: answers.time_taken,
          correct_answers: results.correct_count,
          total_questions: results.total_count,
          detailed_answers: this.serializeToJson(results.results),
          graded_at: new Date(),
        },
      });

      // Update overall test result status or scores here
      const isReading = testSection.section_type === TEST_TYPE.READING;
      const isListening = testSection.section_type === TEST_TYPE.LISTENING;
      const readingScore = isReading
        ? results.band_score
        : Number(testResult.reading_score) || null;
      const listeningScore = isListening
        ? results.band_score
        : Number(testResult.listening_score) || null;
      const score = this.gradingService.calculateOverallTestScore(
        readingScore,
        listeningScore,
        Number(testResult.writing_score) || null,
        Number(testResult.speaking_score) || null,
      );
      await tx.test_results.update({
        where: { id: testResult.id },
        data: {
          band_score: score,
          reading_score: readingScore,
          listening_score: listeningScore,
          time_taken: (testResult.time_taken || 0) + answers.time_taken,
          updated_at: new Date(),
        },
      });

      this.logger.log(
        `Submitted section answers for test result: ${testResult.id}`,
      );

      return {
        success: true,
        data: {
          band_score: results.band_score,
          correct_answers: results.correct_count,
          total_questions: results.total_count,
          detailed_answers: results.results,
        },
      };
    });
  }

  /**
   * Submit speaking section - download audio files, grade all questions, then calculate band score
   */
  private async submitSpeakingSection(
    answers: TestSectionSubmissionDto,
    testResult: any,
    testSection: any,
  ) {
    const gradingMethod = answers.grading_method || 'ai'; // Default to 'ai' if not specified
    const audioData = answers.speaking_audio_data || [];

    // Validate audio data
    if (!audioData || audioData.length === 0) {
      throw new BadRequestException(
        'No audio files provided for speaking section. Please record or upload audio for at least one question.',
      );
    }

    // If grading_method is 'teacher', save submission without grading and return
    if (gradingMethod === 'teacher') {
      return await this.saveSpeakingForTeacherGrading(
        answers,
        testResult,
        testSection,
      );
    }

    this.logger.log(
      `Grading ${audioData.length} speaking questions for test result: ${testResult.id}`,
    );

    // Get questions from DB to retrieve audio_url, group_instruction, and exercise part_type
    const questionIds = audioData.map((item) => item.question_id);
    const questionsFromDb = await this.prisma.questions.findMany({
      where: {
        id: { in: questionIds },
        deleted: false,
      },
      include: {
        question_groups: {
          select: {
            id: true,
            group_instruction: true,
            group_title: true,
          },
        },
        exercises: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    const questionMap = new Map(questionsFromDb.map((q) => [q.id, q]));

    // Grade all questions in parallel
    const gradingPromises = audioData.map(async (audioItem) => {
      try {
        // Download audio file from URL
        const audioResponse = await axios.get(audioItem.audio_url, {
          responseType: 'arraybuffer',
        });
        const audioBuffer = Buffer.from(audioResponse.data);

        // Get question from DB to retrieve audio_url, group_instruction, and exercise part_type
        const questionFromDb = questionMap.get(audioItem.question_id);
        const questionText =
          audioItem.question_text ||
          questionFromDb?.question_text ||
          questionFromDb?.question_groups?.[0]?.group_instruction ||
          'Speaking question';
        const questionAudioUrl = questionFromDb?.audio_url || undefined;
        const groupInstruction =
          questionFromDb?.question_groups?.[0]?.group_instruction || undefined;

        // Determine part type from exercise content or question_group title
        let partType: SpeakingPart = SpeakingPart.PART_1;

        // Try to get from exercise content first
        if (questionFromDb?.exercises?.content) {
          try {
            const exerciseContent =
              typeof questionFromDb.exercises.content === 'string'
                ? JSON.parse(questionFromDb.exercises.content)
                : questionFromDb.exercises.content;
            const contentPartType =
              exerciseContent.partType || exerciseContent.part_type;
            if (contentPartType) {
              if (
                contentPartType === 'part_1' ||
                contentPartType === 'Part 1'
              ) {
                partType = SpeakingPart.PART_1;
              } else if (
                contentPartType === 'part_2' ||
                contentPartType === 'Part 2'
              ) {
                partType = SpeakingPart.PART_2;
              } else if (
                contentPartType === 'part_3' ||
                contentPartType === 'Part 3'
              ) {
                partType = SpeakingPart.PART_3;
              }
            }
          } catch (e) {
            this.logger.warn(
              `Failed to parse exercise content for part type: ${e}`,
            );
          }
        }

        // Fallback: Try to determine from question_group title
        if (
          partType === SpeakingPart.PART_1 &&
          questionFromDb?.question_groups?.[0]?.group_title
        ) {
          const groupTitle =
            questionFromDb.question_groups[0].group_title.toLowerCase();
          if (
            groupTitle.includes('part 2') ||
            groupTitle.includes('part2') ||
            groupTitle.includes('long turn')
          ) {
            partType = SpeakingPart.PART_2;
          } else if (
            groupTitle.includes('part 3') ||
            groupTitle.includes('part3') ||
            groupTitle.includes('discussion')
          ) {
            partType = SpeakingPart.PART_3;
          } else if (
            groupTitle.includes('part 1') ||
            groupTitle.includes('part1') ||
            groupTitle.includes('introduction')
          ) {
            partType = SpeakingPart.PART_1;
          }
        }

        // Final fallback: Use question ordering (less accurate but better than nothing)
        if (partType === SpeakingPart.PART_1) {
          const questionIndex = audioData.findIndex(
            (item) => item.question_id === audioItem.question_id,
          );
          if (questionIndex >= 3 && questionIndex < 6) {
            partType = SpeakingPart.PART_2;
          } else if (questionIndex >= 6) {
            partType = SpeakingPart.PART_3;
          }
        }

        // Build context string if audio_url or group_instruction exists
        let contextString = '';
        if (questionAudioUrl) {
          contextString += `Audio prompt available at: ${questionAudioUrl}. `;
        }
        if (groupInstruction && groupInstruction !== questionText) {
          contextString += `Additional context: ${groupInstruction}`;
        }

        // Grade the question
        const gradeDto: TranscribeAndGradeDto = {
          audioBuffer,
          fileName: `speaking-${audioItem.question_id}.webm`,
          mimetype: 'audio/webm',
          partType,
          questions: [
            {
              question: questionText,
              context: contextString || undefined,
            },
          ],
          targetDuration:
            partType === SpeakingPart.PART_1
              ? '4-5 minutes'
              : partType === SpeakingPart.PART_2
                ? '1-2 minutes'
                : '4-5 minutes',
        };

        const result = await this.speakingService.transcribeAndGrade(gradeDto);
        return {
          question_id: audioItem.question_id,
          ...result,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to grade question ${audioItem.question_id}: ${errorMessage}`,
        );
        throw new BadRequestException(
          `Failed to grade question ${audioItem.question_id}: ${errorMessage}`,
        );
      }
    });

    // Wait for all questions to be graded
    const questionResults = await Promise.all(gradingPromises);

    // Group questions by part type and calculate scores
    // IELTS Speaking scoring: Each part has different weight
    // Part 1: 25%, Part 2: 35%, Part 3: 40% (standard IELTS weighting)
    const partResults: {
      [key: string]: {
        results: any[];
        avgFluency: number;
        avgLexical: number;
        avgGrammar: number;
        avgPronunciation: number;
        overallScore: number;
      };
    } = {
      [SpeakingPart.PART_1]: {
        results: [],
        avgFluency: 0,
        avgLexical: 0,
        avgGrammar: 0,
        avgPronunciation: 0,
        overallScore: 0,
      },
      [SpeakingPart.PART_2]: {
        results: [],
        avgFluency: 0,
        avgLexical: 0,
        avgGrammar: 0,
        avgPronunciation: 0,
        overallScore: 0,
      },
      [SpeakingPart.PART_3]: {
        results: [],
        avgFluency: 0,
        avgLexical: 0,
        avgGrammar: 0,
        avgPronunciation: 0,
        overallScore: 0,
      },
    };

    // Group results by part
    for (const result of questionResults) {
      if (result && result.grading) {
        const grading = result.grading;
        // Validate grading has all required fields
        if (
          typeof grading.fluencyCoherence !== 'number' ||
          typeof grading.lexicalResource !== 'number' ||
          typeof grading.grammaticalRangeAccuracy !== 'number' ||
          typeof grading.pronunciation !== 'number'
        ) {
          this.logger.warn(
            `Invalid grading data for question ${result.question_id}, skipping`,
          );
          continue;
        }

        // Determine part type from question in DB (same logic as above)
        const questionFromDb = questionMap.get(result.question_id);
        let partType: SpeakingPart = SpeakingPart.PART_1;

        // Try to get from exercise content first
        if (questionFromDb?.exercises?.content) {
          try {
            const exerciseContent =
              typeof questionFromDb.exercises.content === 'string'
                ? JSON.parse(questionFromDb.exercises.content)
                : questionFromDb.exercises.content;
            const contentPartType =
              exerciseContent.partType || exerciseContent.part_type;
            if (contentPartType) {
              if (
                contentPartType === 'part_1' ||
                contentPartType === 'Part 1'
              ) {
                partType = SpeakingPart.PART_1;
              } else if (
                contentPartType === 'part_2' ||
                contentPartType === 'Part 2'
              ) {
                partType = SpeakingPart.PART_2;
              } else if (
                contentPartType === 'part_3' ||
                contentPartType === 'Part 3'
              ) {
                partType = SpeakingPart.PART_3;
              }
            }
          } catch (e) {
            this.logger.warn(
              `Failed to parse exercise content for part type: ${e}`,
            );
          }
        }

        // Fallback: Try to determine from question_group title
        if (
          partType === SpeakingPart.PART_1 &&
          questionFromDb?.question_groups?.[0]?.group_title
        ) {
          const groupTitle =
            questionFromDb.question_groups[0].group_title.toLowerCase();
          if (
            groupTitle.includes('part 2') ||
            groupTitle.includes('part2') ||
            groupTitle.includes('long turn')
          ) {
            partType = SpeakingPart.PART_2;
          } else if (
            groupTitle.includes('part 3') ||
            groupTitle.includes('part3') ||
            groupTitle.includes('discussion')
          ) {
            partType = SpeakingPart.PART_3;
          } else if (
            groupTitle.includes('part 1') ||
            groupTitle.includes('part1') ||
            groupTitle.includes('introduction')
          ) {
            partType = SpeakingPart.PART_1;
          }
        }

        // Final fallback: Use question ordering
        if (partType === SpeakingPart.PART_1) {
          const questionIndex = audioData.findIndex(
            (item) => item.question_id === result.question_id,
          );
          if (questionIndex >= 3 && questionIndex < 6) {
            partType = SpeakingPart.PART_2;
          } else if (questionIndex >= 6) {
            partType = SpeakingPart.PART_3;
          }
        }

        partResults[partType].results.push(result);
      }
    }

    // Calculate average scores for each part
    for (const partType of [
      SpeakingPart.PART_1,
      SpeakingPart.PART_2,
      SpeakingPart.PART_3,
    ]) {
      const partData = partResults[partType];
      if (partData.results.length === 0) continue;

      let totalFluency = 0;
      let totalLexical = 0;
      let totalGrammar = 0;
      let totalPronunciation = 0;

      for (const result of partData.results) {
        totalFluency += result.grading.fluencyCoherence;
        totalLexical += result.grading.lexicalResource;
        totalGrammar += result.grading.grammaticalRangeAccuracy;
        totalPronunciation += result.grading.pronunciation;
      }

      partData.avgFluency = totalFluency / partData.results.length;
      partData.avgLexical = totalLexical / partData.results.length;
      partData.avgGrammar = totalGrammar / partData.results.length;
      partData.avgPronunciation = totalPronunciation / partData.results.length;

      // Calculate overall score for this part (average of 4 criteria)
      partData.overallScore =
        (partData.avgFluency +
          partData.avgLexical +
          partData.avgGrammar +
          partData.avgPronunciation) /
        4;
    }

    // Calculate weighted overall band score
    // IELTS standard weighting: Part 1: 25%, Part 2: 35%, Part 3: 40%
    const weights = {
      [SpeakingPart.PART_1]: 0.25,
      [SpeakingPart.PART_2]: 0.35,
      [SpeakingPart.PART_3]: 0.4,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    const partScores: Record<string, number> = {};

    for (const partType of [
      SpeakingPart.PART_1,
      SpeakingPart.PART_2,
      SpeakingPart.PART_3,
    ]) {
      const partData = partResults[partType];
      if (partData.results.length > 0) {
        const weight = weights[partType];
        weightedSum += partData.overallScore * weight;
        totalWeight += weight;
        partScores[partType] = partData.overallScore;
      }
    }

    // If no parts have results, fall back to simple average
    let bandScore: number;
    if (totalWeight > 0) {
      bandScore = weightedSum / totalWeight;
    } else {
      // Fallback: simple average of all questions (if no parts are identified)
      const allResults = questionResults.filter((r) => r && r.grading);
      if (allResults.length === 0) {
        throw new BadRequestException(
          'No valid question results found. Please ensure all questions have been graded correctly.',
        );
      }

      let totalFluency = 0;
      let totalLexical = 0;
      let totalGrammar = 0;
      let totalPronunciation = 0;

      for (const result of allResults) {
        if (result.grading) {
          totalFluency += result.grading.fluencyCoherence;
          totalLexical += result.grading.lexicalResource;
          totalGrammar += result.grading.grammaticalRangeAccuracy;
          totalPronunciation += result.grading.pronunciation;
        }
      }

      const avgFluency = totalFluency / allResults.length;
      const avgLexical = totalLexical / allResults.length;
      const avgGrammar = totalGrammar / allResults.length;
      const avgPronunciation = totalPronunciation / allResults.length;
      bandScore = (avgFluency + avgLexical + avgGrammar + avgPronunciation) / 4;
    }

    // Round to nearest 0.5
    bandScore = Math.round(bandScore * 2) / 2;

    // Calculate overall averages for all questions (for detailed results)
    const allDetailedResults = questionResults.filter((r) => r && r.grading);
    let totalFluency = 0;
    let totalLexical = 0;
    let totalGrammar = 0;
    let totalPronunciation = 0;

    // Aggregate strengths, weaknesses, and suggestions from all questions
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const allSuggestions: string[] = [];
    const allDetailedFeedbacks: string[] = [];

    for (const result of allDetailedResults) {
      totalFluency += result.grading.fluencyCoherence;
      totalLexical += result.grading.lexicalResource;
      totalGrammar += result.grading.grammaticalRangeAccuracy;
      totalPronunciation += result.grading.pronunciation;

      // Collect strengths, weaknesses, suggestions, and detailed feedback
      if (result.grading.strengths && Array.isArray(result.grading.strengths)) {
        allStrengths.push(...result.grading.strengths);
      }
      if (
        result.grading.weaknesses &&
        Array.isArray(result.grading.weaknesses)
      ) {
        allWeaknesses.push(...result.grading.weaknesses);
      }
      if (
        result.grading.suggestions &&
        Array.isArray(result.grading.suggestions)
      ) {
        allSuggestions.push(...result.grading.suggestions);
      }
      if (result.grading.detailedFeedback) {
        allDetailedFeedbacks.push(result.grading.detailedFeedback);
      }
    }

    const avgFluency =
      allDetailedResults.length > 0
        ? totalFluency / allDetailedResults.length
        : 0;
    const avgLexical =
      allDetailedResults.length > 0
        ? totalLexical / allDetailedResults.length
        : 0;
    const avgGrammar =
      allDetailedResults.length > 0
        ? totalGrammar / allDetailedResults.length
        : 0;
    const avgPronunciation =
      allDetailedResults.length > 0
        ? totalPronunciation / allDetailedResults.length
        : 0;

    // Remove duplicates and create unique arrays
    const uniqueStrengths = Array.from(new Set(allStrengths));
    const uniqueWeaknesses = Array.from(new Set(allWeaknesses));
    const uniqueSuggestions = Array.from(new Set(allSuggestions));

    // Validate that we have at least one valid question result
    if (allDetailedResults.length === 0) {
      throw new BadRequestException(
        'No valid question results found. Please ensure all questions have been graded correctly.',
      );
    }

    // Save section result and update test result
    return await this.prisma.$transaction(async (tx) => {
      // Save section result
      await tx.section_results.create({
        data: {
          test_result_id: testResult.id,
          test_section_id: testSection.id,
          band_score: bandScore,
          time_taken: answers.time_taken,
          correct_answers: allDetailedResults.length,
          total_questions: audioData.length,
          detailed_answers: this.serializeToJson({
            all_questions: allDetailedResults,
            part_scores: partScores,
            part_averages: {
              [SpeakingPart.PART_1]:
                partResults[SpeakingPart.PART_1].results.length > 0
                  ? {
                      fluencyCoherence:
                        Math.round(
                          partResults[SpeakingPart.PART_1].avgFluency * 2,
                        ) / 2,
                      lexicalResource:
                        Math.round(
                          partResults[SpeakingPart.PART_1].avgLexical * 2,
                        ) / 2,
                      grammaticalRangeAccuracy:
                        Math.round(
                          partResults[SpeakingPart.PART_1].avgGrammar * 2,
                        ) / 2,
                      pronunciation:
                        Math.round(
                          partResults[SpeakingPart.PART_1].avgPronunciation * 2,
                        ) / 2,
                      overallScore:
                        Math.round(
                          partResults[SpeakingPart.PART_1].overallScore * 2,
                        ) / 2,
                    }
                  : null,
              [SpeakingPart.PART_2]:
                partResults[SpeakingPart.PART_2].results.length > 0
                  ? {
                      fluencyCoherence:
                        Math.round(
                          partResults[SpeakingPart.PART_2].avgFluency * 2,
                        ) / 2,
                      lexicalResource:
                        Math.round(
                          partResults[SpeakingPart.PART_2].avgLexical * 2,
                        ) / 2,
                      grammaticalRangeAccuracy:
                        Math.round(
                          partResults[SpeakingPart.PART_2].avgGrammar * 2,
                        ) / 2,
                      pronunciation:
                        Math.round(
                          partResults[SpeakingPart.PART_2].avgPronunciation * 2,
                        ) / 2,
                      overallScore:
                        Math.round(
                          partResults[SpeakingPart.PART_2].overallScore * 2,
                        ) / 2,
                    }
                  : null,
              [SpeakingPart.PART_3]:
                partResults[SpeakingPart.PART_3].results.length > 0
                  ? {
                      fluencyCoherence:
                        Math.round(
                          partResults[SpeakingPart.PART_3].avgFluency * 2,
                        ) / 2,
                      lexicalResource:
                        Math.round(
                          partResults[SpeakingPart.PART_3].avgLexical * 2,
                        ) / 2,
                      grammaticalRangeAccuracy:
                        Math.round(
                          partResults[SpeakingPart.PART_3].avgGrammar * 2,
                        ) / 2,
                      pronunciation:
                        Math.round(
                          partResults[SpeakingPart.PART_3].avgPronunciation * 2,
                        ) / 2,
                      overallScore:
                        Math.round(
                          partResults[SpeakingPart.PART_3].overallScore * 2,
                        ) / 2,
                    }
                  : null,
            },
            overall_criteria_scores: {
              fluencyCoherence: Math.round(avgFluency * 2) / 2,
              lexicalResource: Math.round(avgLexical * 2) / 2,
              grammaticalRangeAccuracy: Math.round(avgGrammar * 2) / 2,
              pronunciation: Math.round(avgPronunciation * 2) / 2,
            },
            strengths: uniqueStrengths,
            weaknesses: uniqueWeaknesses,
            suggestions: uniqueSuggestions,
            overall_feedback: allDetailedFeedbacks.join('\n\n'),
          }),
          graded_at: new Date(),
        },
      });

      // Update overall test result
      const score = this.gradingService.calculateOverallTestScore(
        Number(testResult.reading_score) || null,
        Number(testResult.listening_score) || null,
        Number(testResult.writing_score) || null,
        bandScore,
      );
      await tx.test_results.update({
        where: { id: testResult.id },
        data: {
          band_score: score,
          speaking_score: bandScore,
          time_taken: (testResult.time_taken || 0) + answers.time_taken,
          updated_at: new Date(),
        },
      });

      this.logger.log(
        `Submitted speaking section answers for test result: ${testResult.id}`,
      );

      return {
        success: true,
        data: {
          band_score: bandScore,
          correct_answers: allDetailedResults.length,
          total_questions: audioData.length,
          detailed_answers: allDetailedResults,
          criteria_scores: {
            fluencyCoherence: Math.round(avgFluency * 2) / 2,
            lexicalResource: Math.round(avgLexical * 2) / 2,
            grammaticalRangeAccuracy: Math.round(avgGrammar * 2) / 2,
            pronunciation: Math.round(avgPronunciation * 2) / 2,
          },
          part_scores: partScores,
          weighting: {
            [SpeakingPart.PART_1]: weights[SpeakingPart.PART_1],
            [SpeakingPart.PART_2]: weights[SpeakingPart.PART_2],
            [SpeakingPart.PART_3]: weights[SpeakingPart.PART_3],
          },
        },
      };
    });
  }

  private async handleWritingSectionSubmission(
    answers: TestSectionSubmissionDto,
    testResult: any,
    testSection: any,
  ) {
    const gradingMethod = answers.grading_method || 'ai'; // Default to 'ai' if not specified
    // Get all questions in the writing section with exercises (for image_url from exercise.content)
    const questions = await this.prisma.questions.findMany({
      where: {
        exercises: {
          test_section_id: testSection.id,
          deleted: false,
        },
        deleted: false,
        question_type: 'essay',
      },
      include: {
        question_groups: {
          select: {
            id: true,
            image_url: true,
            group_instruction: true,
          },
        },
        exercises: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: { ordering: 'asc' },
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        'No writing questions found in this section',
      );
    }

    this.logger.log(
      `Grading ${questions.length} writing questions for test result: ${testResult.id}`,
    );

    // Extract essay answers from submission
    const essayAnswers: Record<string, string> = {};
    const answerDetails: Array<{
      question_id: string;
      answer_length: number;
      preview: string;
    }> = [];

    for (const answerDto of answers.answers) {
      if (answerDto.user_answer.essay_answers) {
        const answerText = answerDto.user_answer.essay_answers.trim();
        const answerLength = answerText.length;

        // Log each answer submission
        answerDetails.push({
          question_id: answerDto.question_id,
          answer_length: answerLength,
          preview: answerText.substring(0, 100) + '...',
        });

        // If duplicate question_id, log warning and use the first one
        if (essayAnswers[answerDto.question_id]) {
          this.logger.warn(
            `Duplicate answer for question ${answerDto.question_id}. First answer length: ${essayAnswers[answerDto.question_id].length}, New answer length: ${answerLength}`,
          );
          // Keep the first answer, skip duplicate
          continue;
        }

        essayAnswers[answerDto.question_id] = answerText;
      }
    }

    // Log all answers for debugging
    this.logger.log(
      `Extracted ${Object.keys(essayAnswers).length} unique essay answer(s):`,
    );
    for (const detail of answerDetails) {
      this.logger.log(
        `  - Question ${detail.question_id}: ${detail.answer_length} chars - "${detail.preview}"`,
      );
    }

    // Identify Task 1 and Task 2 questions
    // Logic: Check question_group, question_text, ordering, and answers submitted
    let task1Question: any = null;
    let task2Question: any = null;
    let task1Answer = '';
    let task2Answer = '';

    // Create a map of question_id -> question for quick lookup
    const questionMap = new Map<string, any>();
    for (const question of questions) {
      questionMap.set(question.id, question);
    }

    // First pass: Identify Task 1 and Task 2 based on keywords in questions
    for (const question of questions) {
      const answer = essayAnswers[question.id] || '';
      if (!answer || answer.trim().length === 0) {
        continue; // Skip questions without answers
      }

      const isTask1 =
        question.question_group?.toLowerCase().includes('task 1') ||
        question.question_group?.toLowerCase().includes('task1') ||
        question.question_text?.toLowerCase().includes('task 1') ||
        question.question_text?.toLowerCase().includes('150') ||
        question.question_text?.toLowerCase().includes('chart') ||
        question.question_text?.toLowerCase().includes('graph') ||
        question.question_text?.toLowerCase().includes('table') ||
        question.question_text?.toLowerCase().includes('diagram');

      if (isTask1 && !task1Question) {
        task1Question = question;
        task1Answer = answer;
      } else if (!isTask1 && !task2Question) {
        task2Question = question;
        task2Answer = answer;
      }
    }

    // Second pass: Check answers that don't have matching questions in DB
    // This handles cases where frontend submits answers for questions not yet in DB
    const submittedQuestionIds = Object.keys(essayAnswers);
    for (const questionId of submittedQuestionIds) {
      const answer = essayAnswers[questionId];
      if (!answer || answer.trim().length === 0) {
        continue;
      }

      // Skip if already assigned
      if (
        (task1Question && task1Question.id === questionId) ||
        (task2Question && task2Question.id === questionId)
      ) {
        continue;
      }

      // If question exists in DB, use it; otherwise create a minimal question object
      let question = questionMap.get(questionId);
      if (!question) {
        // Create a minimal question object for answers without matching DB questions
        question = {
          id: questionId,
          question_text: 'Essay question',
          question_group: null,
          image_url: null,
          question_groups: null,
        };
      }

      // Check if it's Task 1 based on answer length and content
      const answerLength = answer.trim().length;
      const isTask1Candidate =
        answerLength < 2000 || // Task 1 typically shorter
        answer.toLowerCase().includes('chart') ||
        answer.toLowerCase().includes('graph') ||
        answer.toLowerCase().includes('table') ||
        answer.toLowerCase().includes('diagram');

      // Assign based on what's missing
      if (!task1Question && isTask1Candidate) {
        task1Question = question;
        task1Answer = answer;
      } else if (!task2Question && !isTask1Candidate) {
        task2Question = question;
        task2Answer = answer;
      } else if (!task1Question) {
        // If Task 1 still not found, assign this as Task 1
        task1Question = question;
        task1Answer = answer;
      } else if (!task2Question) {
        // If Task 2 still not found, assign this as Task 2
        task2Question = question;
        task2Answer = answer;
      }
    }

    // Third pass: Use ordering from questions array (first = Task 1, second = Task 2)
    // Only assign questions that haven't been assigned yet
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = essayAnswers[question.id] || '';
      if (!answer || answer.trim().length === 0) {
        continue;
      }

      // Skip if already assigned
      if (
        (task1Question && task1Question.id === question.id) ||
        (task2Question && task2Question.id === question.id)
      ) {
        continue;
      }

      // Assign based on ordering
      if (!task1Question && i === 0) {
        task1Question = question;
        task1Answer = answer;
      } else if (!task2Question && i === 1) {
        task2Question = question;
        task2Answer = answer;
      }
    }

    // Debug logging
    this.logger.log(
      `Writing section has ${questions.length} question(s), ${Object.keys(essayAnswers).length} answer(s) submitted`,
    );
    this.logger.log(
      `Task 1: question_id=${task1Question?.id || 'none'}, answer length=${task1Answer.length}`,
    );
    this.logger.log(
      `Task 2: question_id=${task2Question?.id || 'none'}, answer length=${task2Answer.length}`,
    );

    // Prevent duplicate grading: if both tasks have the same question_id, only grade as Task 1
    if (
      task1Question &&
      task2Question &&
      task1Question.id === task2Question.id
    ) {
      this.logger.warn(
        `Both Task 1 and Task 2 assigned to same question (${task1Question.id}). Only grading as Task 1.`,
      );
      task2Question = null;
      task2Answer = '';
    }

    // If grading_method is 'teacher', save submission without grading and return
    if (gradingMethod === 'teacher') {
      return await this.saveWritingForTeacherGrading(
        answers,
        testResult,
        testSection,
        questions,
        essayAnswers,
      );
    }

    // Grade Task 1 and Task 2 using AI
    // Add delay between requests to avoid API overload
    const gradingPromises: Promise<any>[] = [];

    if (task1Question && task1Answer.trim().length > 0) {
      // Get image_url with priority: question_group > exercise.content.questionImage > chart_url/image_url > question.image_url
      let imageUrl: string | undefined = undefined;

      // Priority 1: Get from question_group.image_url (backend saves from admin form)
      imageUrl = task1Question.question_groups?.[0]?.image_url || undefined;

      // Priority 2: Get from exercise.content.questionImage (backend saves from admin form)
      if (!imageUrl && task1Question.exercises?.content) {
        try {
          const exerciseContent =
            typeof task1Question.exercises.content === 'string'
              ? JSON.parse(task1Question.exercises.content)
              : task1Question.exercises.content;
          imageUrl =
            exerciseContent.questionImage ||
            exerciseContent.chart_url ||
            exerciseContent.image_url ||
            undefined;
        } catch (e) {
          this.logger.warn(
            `Failed to parse exercise content for imageUrl: ${e}`,
          );
        }
      }

      // Priority 3: Fallback to question.image_url
      if (!imageUrl) {
        imageUrl = task1Question.image_url || undefined;
      }

      // Get question text from question.question_text or question_groups.group_instruction
      const questionText =
        task1Question.question_text ||
        task1Question.question_groups?.[0]?.group_instruction ||
        'Writing Task 1';

      const gradeDto: GradeWritingDto = {
        studentAnswer: task1Answer,
        question: questionText,
        taskType: WritingTaskType.TASK_1,
        wordLimit: '150-200 words',
        imageUrl: imageUrl || undefined, // Optional - only for Task 1
      };

      // Start Task 1 grading immediately
      gradingPromises.push(
        this.writingService.gradeWritingByGemini(gradeDto).then((result) => ({
          task: 'task1',
          question_id: task1Question.id,
          ...result,
        })),
      );
    }

    if (task2Question && task2Answer.trim().length > 0) {
      // Get question text from question.question_text or question_groups.group_instruction
      const questionText =
        task2Question.question_text ||
        task2Question.question_groups?.[0]?.group_instruction ||
        'Writing Task 2';

      const gradeDto: GradeWritingDto = {
        studentAnswer: task2Answer,
        question: questionText,
        taskType: WritingTaskType.TASK_2,
        wordLimit: '250+ words',
      };

      const task2Promise = new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            this.writingService
              .gradeWritingByGemini(gradeDto)
              .then((result) => ({
                task: 'task2',
                question_id: task2Question.id,
                ...result,
              })),
          );
        }, 4000);
      });

      gradingPromises.push(task2Promise as Promise<any>);
    }

    if (gradingPromises.length === 0) {
      throw new BadRequestException(
        'No valid writing answers found. Please provide answers for at least one task.',
      );
    }

    // Wait for all tasks to be graded
    // Use Promise.allSettled to handle partial failures gracefully
    const taskResultsSettled = await Promise.allSettled(gradingPromises);
    const taskResults: any[] = [];
    const gradingErrors: string[] = [];

    for (let i = 0; i < taskResultsSettled.length; i++) {
      const result = taskResultsSettled[i];
      if (result.status === 'fulfilled') {
        taskResults.push(result.value);
      } else {
        const taskName = i === 0 && task1Question ? 'Task 1' : 'Task 2';
        const errorMsg = result.reason?.message || 'Unknown error';
        gradingErrors.push(`${taskName}: ${errorMsg}`);
        this.logger.error(`Failed to grade ${taskName}:`, result.reason);
      }
    }

    // If all grading failed, throw error
    if (taskResults.length === 0) {
      throw new BadRequestException(
        `Failed to grade writing tasks: ${gradingErrors.join('; ')}`,
      );
    }

    // Log warnings if some tasks failed
    if (gradingErrors.length > 0) {
      this.logger.warn(
        `Some writing tasks failed to grade: ${gradingErrors.join('; ')}`,
      );
    }

    const task1Result = taskResults.find((r) => r.task === 'task1');
    const task2Result = taskResults.find((r) => r.task === 'task2');

    // Calculate overall writing score using IELTS weighting
    // Task 2 = 2/3 weight, Task 1 = 1/3 weight
    let overallWritingScore = 0;
    if (task1Result && task2Result) {
      // Both tasks: weighted average
      overallWritingScore =
        (task1Result.overallScore * 1 + task2Result.overallScore * 2) / 3;
    } else if (task2Result) {
      // Only Task 2
      overallWritingScore = task2Result.overallScore;
    } else if (task1Result) {
      // Only Task 1 (shouldn't happen in real IELTS, but handle it)
      overallWritingScore = task1Result.overallScore;
    }

    // Round to nearest 0.5
    overallWritingScore = Math.round(overallWritingScore * 2) / 2;

    // Prepare detailed answers structure
    const detailedAnswers: any = {
      overallScore: overallWritingScore,
    };

    // Add error information for failed tasks
    if (gradingErrors.length > 0) {
      detailedAnswers.gradingErrors = gradingErrors;
      detailedAnswers.partialGrading = true;
    }

    if (task1Result) {
      detailedAnswers.task1 = {
        score: task1Result.overallScore,
        taskAchievement: task1Result.taskAchievement,
        coherenceCohesion: task1Result.coherenceCohesion,
        lexicalResource: task1Result.lexicalResource,
        grammaticalRangeAccuracy: task1Result.grammaticalRangeAccuracy,
        detailedFeedback: task1Result.detailedFeedback,
        suggestions: task1Result.suggestions,
        strengths: task1Result.strengths,
        weaknesses: task1Result.weaknesses,
        detailedMetrics: task1Result.detailedMetrics?.task1,
        upgradedEssay: task1Result.upgradedEssay,
        sampleAnswer: task1Result.sampleAnswer,
      };
    } else if (task1Question && task1Answer.trim().length > 0) {
      // Task 1 was submitted but failed to grade
      const task1Error = gradingErrors.find((e) => e.includes('Task 1'));
      detailedAnswers.task1 = {
        error: task1Error || 'Failed to grade Task 1',
        score: null,
      };
    }

    if (task2Result) {
      detailedAnswers.task2 = {
        score: task2Result.overallScore,
        taskAchievement: task2Result.taskAchievement,
        coherenceCohesion: task2Result.coherenceCohesion,
        lexicalResource: task2Result.lexicalResource,
        grammaticalRangeAccuracy: task2Result.grammaticalRangeAccuracy,
        detailedFeedback: task2Result.detailedFeedback,
        suggestions: task2Result.suggestions,
        strengths: task2Result.strengths,
        weaknesses: task2Result.weaknesses,
        detailedMetrics: task2Result.detailedMetrics?.task2,
        upgradedEssay: task2Result.upgradedEssay,
        sampleAnswer: task2Result.sampleAnswer,
      };
    } else if (task2Question && task2Answer.trim().length > 0) {
      // Task 2 was submitted but failed to grade
      const task2Error = gradingErrors.find((e) => e.includes('Task 2'));
      detailedAnswers.task2 = {
        error: task2Error || 'Failed to grade Task 2',
        score: null,
      };
    }

    // Save section result and update test result
    return await this.prisma.$transaction(async (tx) => {
      // Save section result
      await tx.section_results.create({
        data: {
          test_result_id: testResult.id,
          test_section_id: testSection.id,
          band_score: overallWritingScore,
          time_taken: answers.time_taken,
          correct_answers: taskResults.length,
          total_questions: questions.length,
          detailed_answers: this.serializeToJson(detailedAnswers),
          graded_at: new Date(),
        },
      });

      // Update overall test result
      const score = this.gradingService.calculateOverallTestScore(
        Number(testResult.reading_score) || null,
        Number(testResult.listening_score) || null,
        overallWritingScore,
        Number(testResult.speaking_score) || null,
      );
      await tx.test_results.update({
        where: { id: testResult.id },
        data: {
          band_score: score,
          writing_score: overallWritingScore,
          time_taken: (testResult.time_taken || 0) + answers.time_taken,
          updated_at: new Date(),
        },
      });

      this.logger.log(
        `Submitted writing section answers for test result: ${testResult.id}`,
      );

      return {
        success: true,
        data: {
          band_score: overallWritingScore,
          correct_answers: taskResults.length,
          total_questions: questions.length,
          detailed_answers: detailedAnswers,
          task1_score: task1Result?.overallScore || null,
          task2_score: task2Result?.overallScore || null,
          weighting: {
            task1: task1Result ? 1 / 3 : 0,
            task2: task2Result ? 2 / 3 : 0,
          },
          warnings: gradingErrors.length > 0 ? gradingErrors : undefined,
          partial_grading: gradingErrors.length > 0,
        },
      };
    });
  }

  // ======= PRIVATE HELPER METHODS =======

  private serializeToJson(data: unknown): Prisma.InputJsonValue {
    try {
      const jsonString = JSON.stringify(data);
      return JSON.parse(jsonString) as Prisma.InputJsonValue;
    } catch {
      throw new Error('Failed to serialize data to JSON');
    }
  }

  private getAnswer(dto: UserAnswerSubmissionDto): UserAnswer {
    if (dto.fill_blank_answers !== undefined) {
      return dto.fill_blank_answers;
    }
    if (dto.multiple_choice_answers !== undefined) {
      return dto.multiple_choice_answers;
    }
    if (dto.true_false_answers !== undefined) {
      return dto.true_false_answers;
    }
    if (dto.matching_answers !== undefined) {
      return dto.matching_answers;
    }
    return null;
  }

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
