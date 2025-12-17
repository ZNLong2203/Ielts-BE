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
    // Xác thực test_section tồn tại và là loại reading
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

    // Kiểm tra xem bài tập với tiêu đề giống nhau có tồn tại không
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
    // Xác thực test section tồn tại
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

    // Lấy hls nếu audio_url tồn tại
    let hls_url: string | null = null;
    if (exercise.audio_url) {
      hls_url = await this.videoService.getVideoHLSUrl(exercise.audio_url);
    }

    // Lấy nhóm câu hỏi với các câu hỏi và tùy chọn ghép đôi
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

    // Lấy các câu hỏi không thuộc nhóm
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

    // Kiểm tra xung đột tiêu đề nếu tiêu đề đang được cập nhật
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
      // Lấy tất cả các nhóm câu hỏi
      const questionGroups = await tx.question_groups.findMany({
        where: { exercise_id: id, deleted: false },
        select: { id: true },
      });

      if (questionGroups.length > 0) {
        const groupIds = questionGroups.map((g) => g.id);

        // Xóa mềm các tùy chọn ghép đôi
        await tx.matching_options.updateMany({
          where: { set_id: { in: groupIds } },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });

        // Xóa mềm các nhóm câu hỏi
        await tx.question_groups.updateMany({
          where: { exercise_id: id },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });
      }

      // Lấy tất cả các câu hỏi cho bài tập này
      const questions = await tx.questions.findMany({
        where: { exercise_id: id, deleted: false },
        select: { id: true },
      });

      if (questions.length > 0) {
        const questionIds = questions.map((q) => q.id);

        // Xóa mềm các tùy chọn câu hỏi
        await tx.question_options.updateMany({
          where: { question_id: { in: questionIds } },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });

        // Xóa mềm các câu hỏi
        await tx.questions.updateMany({
          where: { exercise_id: id },
          data: {
            deleted: true,
            updated_at: new Date(),
          },
        });
      }

      // Xóa mềm bài tập
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
    // Tốc độ đọc trung bình: 200 từ mỗi phút
    return Math.ceil(wordCount / 200);
  }

  private extractPassageInfo(
    content: any,
  ): ReadingExerciseContent['reading_passage'] {
    // Đoạn văn trống mặc định
    const defaultPassage: ReadingExerciseContent['reading_passage'] = {
      title: '',
      content: '',
      paragraphs: [],
      word_count: 0,
      difficulty_level: 5.0,
      estimated_reading_time: 0,
    };

    if (!content) {
      return defaultPassage;
    }

    // Phân tích chuỗi JSON nếu cần
    let parsedContent: any;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        this.logger.warn('Failed to parse exercise content as JSON string:', e);
        return defaultPassage;
      }
    } else {
      parsedContent = content;
    }

    // Trích xuất reading_passage từ nội dung đã phân tích
    // Hỗ trợ cả định dạng mới (reading_passage) và định dạng cũ (passage)
    let readingPassage = parsedContent?.reading_passage;

    // Tương thích ngược: xử lý định dạng cũ với trường "passage"
    if (!readingPassage && parsedContent?.passage) {
      // Định dạng cũ: {"passage": "text with \n\nA\n\n...B\n\n..."}
      const passageText =
        typeof parsedContent.passage === 'string' ? parsedContent.passage : '';

      // Split by paragraph markers (A, B, C, etc. on new lines)
      const paragraphRegex = /\n\n([A-Z])\n\n/g;
      const matches = [...passageText.matchAll(paragraphRegex)];

      if (matches.length > 0) {
        // Extract title (first line before first paragraph)
        const firstMatchIndex = passageText.indexOf(matches[0][0]);
        const title = passageText.substring(0, firstMatchIndex).trim();

        // Extract paragraphs
        const paragraphs: any[] = [];
        for (let i = 0; i < matches.length; i++) {
          const label = matches[i][1];
          const startIndex = matches[i].index! + matches[i][0].length;
          const endIndex =
            i < matches.length - 1 ? matches[i + 1].index! : passageText.length;
          const content = passageText.substring(startIndex, endIndex).trim();

          paragraphs.push({
            id: `para-${i + 1}`,
            label: label,
            content: content,
          });
        }

        // Combine all content
        const fullContent = passageText
          .replace(/\n\n[A-Z]\n\n/g, '\n\n')
          .trim();

        readingPassage = {
          title: title || 'Reading Passage',
          content: fullContent,
          paragraphs: paragraphs,
        };
      } else {
        // No paragraph markers, treat as single paragraph
        const lines = passageText.split('\n\n');
        const title = lines[0] || 'Reading Passage';
        const content = passageText;

        readingPassage = {
          title: title,
          content: content,
          paragraphs: [
            {
              id: 'para-1',
              label: 'A',
              content: content,
            },
          ],
        };
      }
    }

    if (!readingPassage) {
      return defaultPassage;
    }

    // Ensure all required fields exist with defaults
    return {
      title: readingPassage.title || '',
      content: readingPassage.content || '',
      paragraphs: readingPassage.paragraphs || [],
      word_count:
        readingPassage.word_count ||
        this.calculateWordCount(readingPassage.content || ''),
      difficulty_level: readingPassage.difficulty_level || 5.0,
      estimated_reading_time:
        readingPassage.estimated_reading_time ||
        this.calculateReadingTime(
          readingPassage.word_count ||
            this.calculateWordCount(readingPassage.content || ''),
        ),
    };
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
