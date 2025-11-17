import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { GradingService } from 'src/modules/grading/grading.service';
import { UserAnswer } from 'src/modules/grading/types/grading.types';
import {
  MOCK_TEST_RESULT_STATUS,
  SectionType,
  TEST_TYPE,
  TestType,
} from 'src/modules/mock-tests/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import { SpeakingService } from 'src/modules/speaking/speaking.service';
import { FilesService } from 'src/modules/files/files.service';
import {
  CreateMockTestDto,
  TestSectionSubmissionDto,
  UserAnswerSubmissionDto,
} from './dto/create-mock-test.dto';
import { UpdateMockTestDto } from './dto/update-mock-test.dto';
import { SpeakingQuestion, SpeakingPart, TranscribeAndGradeDto } from 'src/modules/speaking/dto/grade-speaking.dto';

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
  ) {}

  /**
   * Create Mock Test with Sections
   */
  async create(createDto: CreateMockTestDto) {
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
              description: sectionDto.description,
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
                  select: {
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
                description: sectionDto.description,
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
        band_score: true,
        time_taken: true,
        created_at: true,
        updated_at: true,
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
    const audioData = answers.speaking_audio_data || [];

    // Validate audio data
    if (!audioData || audioData.length === 0) {
      throw new BadRequestException(
        'No audio files provided for speaking section. Please record or upload audio for at least one question.',
      );
    }

    this.logger.log(
      `Grading ${audioData.length} speaking questions for test result: ${testResult.id}`,
    );

    // Grade all questions in parallel
    const gradingPromises = audioData.map(async (audioItem) => {
      try {
        // Download audio file from URL
        const audioResponse = await axios.get(audioItem.audio_url, {
          responseType: 'arraybuffer',
        });
        const audioBuffer = Buffer.from(audioResponse.data);

        // Determine part type from question ordering
        const questionIndex = audioData.findIndex(
          (item) => item.question_id === audioItem.question_id,
        );
        let partType: SpeakingPart = SpeakingPart.PART_1;
        if (questionIndex >= 0 && questionIndex < 3) {
          partType = SpeakingPart.PART_1;
        } else if (questionIndex >= 3 && questionIndex < 6) {
          partType = SpeakingPart.PART_2;
        } else {
          partType = SpeakingPart.PART_3;
        }

        // Grade the question
        const gradeDto: TranscribeAndGradeDto = {
          audioBuffer,
          fileName: `speaking-${audioItem.question_id}.webm`,
          mimetype: 'audio/webm',
          partType,
          questions: [
            {
              question: audioItem.question_text,
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

        // Determine part type from question ordering
        const questionIndex = audioData.findIndex(
          (item) => item.question_id === result.question_id,
        );
        let partType: SpeakingPart = SpeakingPart.PART_1;
        if (questionIndex >= 0 && questionIndex < 3) {
          partType = SpeakingPart.PART_1;
        } else if (questionIndex >= 3 && questionIndex < 6) {
          partType = SpeakingPart.PART_2;
        } else {
          partType = SpeakingPart.PART_3;
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
    const allDetailedResults = questionResults.filter(
      (r) => r && r.grading,
    );
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
      if (result.grading.weaknesses && Array.isArray(result.grading.weaknesses)) {
        allWeaknesses.push(...result.grading.weaknesses);
      }
      if (result.grading.suggestions && Array.isArray(result.grading.suggestions)) {
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
              [SpeakingPart.PART_1]: partResults[SpeakingPart.PART_1].results.length > 0
                ? {
                    fluencyCoherence: Math.round(partResults[SpeakingPart.PART_1].avgFluency * 2) / 2,
                    lexicalResource: Math.round(partResults[SpeakingPart.PART_1].avgLexical * 2) / 2,
                    grammaticalRangeAccuracy: Math.round(partResults[SpeakingPart.PART_1].avgGrammar * 2) / 2,
                    pronunciation: Math.round(partResults[SpeakingPart.PART_1].avgPronunciation * 2) / 2,
                    overallScore: Math.round(partResults[SpeakingPart.PART_1].overallScore * 2) / 2,
                  }
                : null,
              [SpeakingPart.PART_2]: partResults[SpeakingPart.PART_2].results.length > 0
                ? {
                    fluencyCoherence: Math.round(partResults[SpeakingPart.PART_2].avgFluency * 2) / 2,
                    lexicalResource: Math.round(partResults[SpeakingPart.PART_2].avgLexical * 2) / 2,
                    grammaticalRangeAccuracy: Math.round(partResults[SpeakingPart.PART_2].avgGrammar * 2) / 2,
                    pronunciation: Math.round(partResults[SpeakingPart.PART_2].avgPronunciation * 2) / 2,
                    overallScore: Math.round(partResults[SpeakingPart.PART_2].overallScore * 2) / 2,
                  }
                : null,
              [SpeakingPart.PART_3]: partResults[SpeakingPart.PART_3].results.length > 0
                ? {
                    fluencyCoherence: Math.round(partResults[SpeakingPart.PART_3].avgFluency * 2) / 2,
                    lexicalResource: Math.round(partResults[SpeakingPart.PART_3].avgLexical * 2) / 2,
                    grammaticalRangeAccuracy: Math.round(partResults[SpeakingPart.PART_3].avgGrammar * 2) / 2,
                    pronunciation: Math.round(partResults[SpeakingPart.PART_3].avgPronunciation * 2) / 2,
                    overallScore: Math.round(partResults[SpeakingPart.PART_3].overallScore * 2) / 2,
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

  // ======= PRIVATE HELPER METHODS =======

  private serializeToJson(data: unknown): Prisma.InputJsonValue {
    try {
      const jsonString = JSON.stringify(data);
      return JSON.parse(jsonString) as Prisma.InputJsonValue;
    } catch (error) {
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
