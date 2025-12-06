import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import { WhisperService } from '../../integrations/whisper/whisper.service';
import { PronunciationAnalysisService } from './pronunciation-analysis.service';
import { FilesService } from '../files/files.service';
import { FileType } from 'src/common/constants/file';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
  TranscribeAndGradeDto,
  TranscribeAndGradeResponse,
} from './dto/grade-speaking.dto';
import { UploadResult } from '../files/minio.service';
import {
  CreateSpeakingMockTestExerciseDto,
  SpeakingPartType,
} from './dto/create-speaking-mock-test.dto';
import { UpdateSpeakingMockTestExerciseDto } from './dto/update-speaking-mock-test.dto';
import { SECTION_TYPE } from '../mock-tests/constants';
import { EXERCISE_TYPE, SKILL_TYPE } from '../reading/types/reading.types';
import { PrismaService } from '../../prisma/prisma.service';

export interface SpeakingContent {
  partType?: string;
  questions?: Array<{
    question_text: string;
    expected_duration?: number;
    instructions?: string;
    audio_url?: string;
  }>;
  additionalInstructions?: string;
}

@Injectable()
export class SpeakingService {
  private readonly logger = new Logger(SpeakingService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly whisperService: WhisperService,
    private readonly pronunciationAnalysisService: PronunciationAnalysisService,
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  async gradeSpeakingByGemini(
    gradeSpeakingDto: GradeSpeakingDto,
  ): Promise<SpeakingGradeResponse> {
    return await this.geminiService.gradeSpeaking(gradeSpeakingDto);
  }

  async uploadAndTranscribe(
    audioBuffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<{ uploadResult: UploadResult; transcription: string }> {
    try {
      // Upload audio to MinIO
      const uploadResult = await this.filesService.uploadFile(
        audioBuffer,
        originalName,
        FileType.AUDIO,
        mimetype,
      );

      // Transcribe using Whisper
      const transcription = await this.whisperService.transcribeAudio(
        audioBuffer,
        originalName,
      );

      return { uploadResult, transcription };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to upload and transcribe audio: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async transcribeAndGrade(
    dto: TranscribeAndGradeDto,
  ): Promise<TranscribeAndGradeResponse> {
    try {
      console.log('Starting transcribeAndGrade for file:', dto.fileName);

      // Ensure audioBuffer is a Buffer
      const audioBuffer: Buffer = Buffer.isBuffer(dto.audioBuffer)
        ? dto.audioBuffer
        : Buffer.from(dto.audioBuffer as ArrayBuffer);

      console.log('Uploading and transcribing audio...');
      const { uploadResult, transcription } = await this.uploadAndTranscribe(
        audioBuffer,
        dto.fileName,
        dto.mimetype,
      );
      console.log('Transcription completed:', transcription.substring(0, 100));

      // Get audio duration for pronunciation analysis
      let audioDuration: number | undefined;
      try {
        audioDuration = await this.getAudioDuration(audioBuffer, dto.fileName);
      } catch (error) {
        // If duration extraction fails, continue without it
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Could not extract audio duration:', errorMessage);
      }

      // Analyze pronunciation and stress patterns from audio
      let pronunciationAnalysis: {
        transcription: string;
        words: Array<{
          word: string;
          expectedStress: number[];
          phonemes: string[];
          syllableCount: number;
        }>;
        metrics: {
          speechRate: number;
          pauseCount: number;
          averageWordLength: number;
          stressPatternMatch: number;
        };
        stressFeedback: string[];
        pronunciationScore: number;
        detailedFeedback: string;
      };
      try {
        pronunciationAnalysis =
          await this.pronunciationAnalysisService.analyzePronunciation(
            transcription,
            audioDuration,
            audioBuffer, // Pass audio buffer for real audio analysis
            dto.fileName, // Pass file name
          );
      } catch (pronunciationError) {
        // If pronunciation analysis fails, log and continue with basic analysis
        const errorMessage =
          pronunciationError instanceof Error
            ? pronunciationError.message
            : 'Unknown error';
        console.warn(
          `Pronunciation analysis failed, using fallback: ${errorMessage}`,
        );
        // Use fallback text-based analysis
        pronunciationAnalysis =
          await this.pronunciationAnalysisService.analyzePronunciation(
            transcription,
            audioDuration,
          );
      }

      // Grade the transcribed text with pronunciation analysis
      console.log('Preparing grading request...');
      const gradeDto: GradeSpeakingDto = {
        studentAnswer: transcription,
        partType: dto.partType,
        questions: dto.questions,
        additionalInstructions: dto.additionalInstructions,
        targetDuration: dto.targetDuration,
        pronunciationAnalysis: {
          transcription: pronunciationAnalysis.transcription,
          metrics: pronunciationAnalysis.metrics,
          stressFeedback: pronunciationAnalysis.stressFeedback,
          pronunciationScore: pronunciationAnalysis.pronunciationScore,
          detailedFeedback: pronunciationAnalysis.detailedFeedback,
        },
      };

      console.log('Calling Gemini API for grading...');
      const gradingResult = await this.geminiService.gradeSpeaking(gradeDto);
      console.log('Grading completed successfully');

      return {
        audioUrl: uploadResult.url,
        transcription,
        grading: gradingResult,
        pronunciationAnalysis: {
          transcription: pronunciationAnalysis.transcription,
          words: pronunciationAnalysis.words,
          metrics: pronunciationAnalysis.metrics,
          stressFeedback: pronunciationAnalysis.stressFeedback,
          pronunciationScore: pronunciationAnalysis.pronunciationScore,
          detailedFeedback: pronunciationAnalysis.detailedFeedback,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('Error in transcribeAndGrade:', errorMessage);
      if (errorStack) {
        console.error('Error stack:', errorStack);
      }

      // Check for specific error types
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT')
      ) {
        throw new HttpException(
          `Network error: ${errorMessage}. Please check your connection and try again.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('TIMEOUT')
      ) {
        throw new HttpException(
          `Request timeout: ${errorMessage}. The operation took too long. Please try again with a shorter audio file.`,
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        `Failed to transcribe and grade: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get audio duration using WAV decoder (ffprobe is unreliable and causes errors)
   */
  private async getAudioDuration(
    audioBuffer: Buffer,
    fileName: string,
  ): Promise<number | undefined> {
    // Only try WAV decoder for WAV files
    // Skip ffprobe entirely as it causes JSON parsing errors when not available
    if (fileName.toLowerCase().endsWith('.wav')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const WavDecoderModule = await import('wav-decoder');
        const decoder = WavDecoderModule as {
          decode: (buffer: Buffer) => Promise<{ duration: number }>;
        };
        const decoded = await decoder.decode(audioBuffer);
        if (decoded && typeof decoded.duration === 'number') {
          return decoded.duration;
        }
      } catch (error) {
        // If WAV decoding fails, return undefined
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Failed to decode WAV file:', errorMessage);
      }
    }

    return undefined;
  }

  /**
   * Create Speaking Exercise in test section (for mock tests)
   */
  async createExerciseForMockTest(
    createDto: CreateSpeakingMockTestExerciseDto,
  ) {
    // Validate test_section exists and is speaking type
    const testSection = await this.prisma.prisma.test_sections.findFirst({
      where: {
        id: createDto.test_section_id,
        section_type: SECTION_TYPE.SPEAKING,
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
      throw new NotFoundException('Speaking test section not found');
    }

    // Check if exercise with same title exists in this test section
    const existingExercise = await this.prisma.prisma.exercises.findFirst({
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

    // Create exercise with minimal content (for backward compatibility)
    const exerciseContent: SpeakingContent = {
      partType: createDto.part_type,
      questions: createDto.questions,
      additionalInstructions: createDto.additional_instructions,
    };

    const exercise = await this.prisma.prisma.$transaction(async (tx) => {
      // Create exercise
      const createdExercise = await tx.exercises.create({
        data: {
          test_section_id: createDto.test_section_id,
          lesson_id: null, // Mock test exercise doesn't belong to lesson
          title: createDto.title,
          instruction: createDto.instruction || '',
          content: exerciseContent as unknown as Prisma.JsonObject,
          exercise_type: EXERCISE_TYPE.MOCK_TEST,
          skill_type: SKILL_TYPE.SPEAKING,
          time_limit: createDto.time_limit || 5,
          max_attempts: 1, // Mock tests typically allow 1 attempt
          passing_score: createDto.passing_score || 70,
          ordering: createDto.ordering || 0,
          is_active: true,
        },
      });

      // Create question groups and questions for each question in the DTO
      if (createDto.questions && createDto.questions.length > 0) {
        for (let i = 0; i < createDto.questions.length; i++) {
          const questionDto = createDto.questions[i];
          const partLabel =
            createDto.part_type === SpeakingPartType.PART_1
              ? 'Part 1'
              : createDto.part_type === SpeakingPartType.PART_2
                ? 'Part 2'
                : createDto.part_type === SpeakingPartType.PART_3
                  ? 'Part 3'
                  : `Part ${i + 1}`;

          const questionGroup = await tx.question_groups.create({
            data: {
              exercise_id: createdExercise.id,
              group_title: partLabel,
              group_instruction:
                questionDto.instructions || questionDto.question_text || '',
              question_type: 'speaking',
              ordering: i + 1,
              question_range: String(i + 1),
              correct_answer_count: 1,
            },
          });

          await tx.questions.create({
            data: {
              exercise_id: createdExercise.id,
              question_group_id: questionGroup.id,
              question_text: questionDto.question_text || '',
              question_type: 'speaking',
              audio_url: questionDto.audio_url || null,
              points: 0, // Speaking questions don't have points
              ordering: i + 1,
            },
          });
        }
      }

      // Return exercise with includes
      const exerciseWithIncludes = await tx.exercises.findFirst({
        where: { id: createdExercise.id },
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

      if (!exerciseWithIncludes) {
        throw new NotFoundException('Failed to retrieve created exercise');
      }

      return exerciseWithIncludes;
    });

    this.logger.log(
      `Created speaking exercise: ${exercise.title} in test section: ${testSection.section_name}`,
    );
    return exercise;
  }

  /**
   * Get Speaking Exercises by test section (for mock tests)
   */
  async getExercisesByTestSectionForMockTest(testSectionId: string) {
    // Validate test section exists
    const testSection = await this.prisma.prisma.test_sections.findFirst({
      where: {
        id: testSectionId,
        section_type: SECTION_TYPE.SPEAKING,
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
      throw new NotFoundException('Speaking test section not found');
    }

    const exercises = await this.prisma.prisma.exercises.findMany({
      where: {
        test_section_id: testSectionId,
        skill_type: SKILL_TYPE.SPEAKING,
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
    });

    return {
      test_section: {
        id: testSection.id,
        section_name: testSection.section_name,
        mock_test: testSection.mock_tests,
      },
      exercises: exercises.map((ex) => ({
        ...ex,
        speaking_content: ex.content as SpeakingContent,
        total_questions: ex._count.questions,
      })),
    };
  }

  /**
   * Get Speaking Exercise by ID with complete details (for mock tests)
   */
  async getExerciseByIdForMockTest(id: string) {
    const exercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.SPEAKING,
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
      throw new NotFoundException('Speaking exercise not found');
    }

    // Get question groups with questions
    const questionGroups = await this.prisma.prisma.question_groups.findMany({
      where: {
        exercise_id: id,
        deleted: false,
      },
      include: {
        questions: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
      orderBy: { ordering: 'asc' },
    });

    const content = exercise.content as SpeakingContent;

    return {
      ...exercise,
      speaking_content: content,
      question_groups: questionGroups,
    };
  }

  /**
   * Update Speaking Exercise (for mock tests)
   */
  async updateExerciseForMockTest(
    id: string,
    updateDto: UpdateSpeakingMockTestExerciseDto,
  ) {
    const existingExercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.SPEAKING,
        deleted: false,
      },
    });

    if (!existingExercise) {
      throw new NotFoundException('Speaking exercise not found');
    }

    // Check for title conflict if title is being updated
    if (updateDto.title && updateDto.title !== existingExercise.title) {
      const conflictingExercise = await this.prisma.prisma.exercises.findFirst({
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

    const existingContent = (existingExercise.content as SpeakingContent) || {};

    const updatedContent: SpeakingContent = {
      ...existingContent,
      partType: updateDto.part_type || existingContent.partType,
      questions: updateDto.questions || existingContent.questions,
      additionalInstructions:
        updateDto.additional_instructions ||
        existingContent.additionalInstructions,
    };

    const exercise = await this.prisma.prisma.$transaction(async (tx) => {
      // Update exercise
      await tx.exercises.update({
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
      });

      // Get existing question groups
      const existingQuestionGroups = await tx.question_groups.findMany({
        where: {
          exercise_id: id,
          deleted: false,
        },
        include: {
          questions: {
            where: { deleted: false },
          },
        },
        orderBy: { ordering: 'asc' },
      });

      const questionsToUpdate =
        updateDto.questions || existingContent.questions || [];
      const partType =
        updateDto.part_type || existingContent.partType || 'part_1';

      // Update or create question groups and questions
      for (let i = 0; i < questionsToUpdate.length; i++) {
        const questionDto = questionsToUpdate[i];
        const partLabel =
          partType === 'part_1'
            ? 'Part 1'
            : partType === 'part_2'
              ? 'Part 2'
              : partType === 'part_3'
                ? 'Part 3'
                : `Part ${i + 1}`;

        if (i < existingQuestionGroups.length) {
          // Update existing question group
          const existingGroup = existingQuestionGroups[i];
          await tx.question_groups.update({
            where: { id: existingGroup.id },
            data: {
              group_title: partLabel,
              group_instruction:
                questionDto.instructions || questionDto.question_text || '',
              updated_at: new Date(),
            },
          });

          // Update existing question
          if (existingGroup.questions.length > 0) {
            await tx.questions.update({
              where: { id: existingGroup.questions[0].id },
              data: {
                question_text: questionDto.question_text || '',
                audio_url: questionDto.audio_url || null,
                updated_at: new Date(),
              },
            });
          }
        } else {
          // Create new question group and question
          const newQuestionGroup = await tx.question_groups.create({
            data: {
              exercise_id: id,
              group_title: partLabel,
              group_instruction:
                questionDto.instructions || questionDto.question_text || '',
              question_type: 'speaking',
              ordering: i + 1,
              question_range: String(i + 1),
              correct_answer_count: 1,
            },
          });

          await tx.questions.create({
            data: {
              exercise_id: id,
              question_group_id: newQuestionGroup.id,
              question_text: questionDto.question_text || '',
              question_type: 'speaking',
              audio_url: questionDto.audio_url || null,
              points: 0,
              ordering: i + 1,
            },
          });
        }
      }

      // Soft delete extra question groups if questions array is shorter
      if (existingQuestionGroups.length > questionsToUpdate.length) {
        const groupsToDelete = existingQuestionGroups.slice(
          questionsToUpdate.length,
        );
        for (const group of groupsToDelete) {
          await tx.question_groups.update({
            where: { id: group.id },
            data: { deleted: true, updated_at: new Date() },
          });
          for (const question of group.questions) {
            await tx.questions.update({
              where: { id: question.id },
              data: { deleted: true, updated_at: new Date() },
            });
          }
        }
      }

      // Return exercise with includes
      const exerciseWithIncludes = await tx.exercises.findFirst({
        where: { id },
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

      if (!exerciseWithIncludes) {
        throw new NotFoundException('Failed to retrieve updated exercise');
      }

      return exerciseWithIncludes;
    });

    this.logger.log(`Updated speaking exercise: ${id}`);
    return {
      ...exercise,
      speaking_content: exercise.content as SpeakingContent,
    };
  }

  /**
   * Delete Speaking Exercise (soft delete) (for mock tests)
   */
  async deleteExerciseForMockTest(id: string): Promise<void> {
    const exercise = await this.prisma.prisma.exercises.findFirst({
      where: {
        id,
        skill_type: SKILL_TYPE.SPEAKING,
        deleted: false,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Speaking exercise not found');
    }

    await this.prisma.prisma.exercises.update({
      where: { id },
      data: {
        deleted: true,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Deleted speaking exercise: ${id}`);
  }

  /**
   * Get all mock tests with speaking sections
   */
  async getMockTestsWithSections() {
    const mockTests = await this.prisma.prisma.mock_tests.findMany({
      where: {
        deleted: false,
        test_sections: {
          some: {
            section_type: SECTION_TYPE.SPEAKING,
            deleted: false,
          },
        },
      },
      include: {
        test_sections: {
          where: {
            section_type: SECTION_TYPE.SPEAKING,
            deleted: false,
          },
          include: {
            exercises: {
              where: {
                skill_type: SKILL_TYPE.SPEAKING,
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

    return mockTests;
  }
}
