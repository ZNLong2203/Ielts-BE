import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  CreateLessonDto,
  ReorderLessonsDto,
} from 'src/modules/lessons/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/modules/lessons/dto/update-lesson.dto';
import { VideoService } from 'src/modules/video/video.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
    private readonly utilsService: UtilsService,
  ) {}

  async create(createLessonDto: CreateLessonDto, sectionId: string) {
    // Verify section exists
    const section = await this.prisma.sections.findFirst({
      where: { id: sectionId, deleted: false },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Get next ordering if not provided
    if (createLessonDto.ordering === undefined) {
      const lastLesson = await this.prisma.lessons.findFirst({
        where: { section_id: sectionId, deleted: false },
        orderBy: { ordering: 'desc' },
      });
      createLessonDto.ordering = (lastLesson?.ordering || 0) + 1;
    }

    const lesson = await this.prisma.lessons.create({
      data: {
        ...createLessonDto,
        section_id: sectionId,
      },
    });

    return {
      success: true,
      data: lesson,
    };
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lessons.findFirst({
      where: { id, deleted: false },
      include: {
        sections: {
          select: {
            id: true,
            title: true,
          },
        },
        exercises: { include: { questions: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    let hlsUrl: string | null = null;
    if (lesson.video_url) {
      hlsUrl = await this.videoService.getVideoHLSUrl(lesson.video_url);
    }

    const { video_duration, ...rest } = lesson;

    return {
      success: true,
      data: {
        ...rest,
        hlsUrl,
        videoDuration: video_duration
          ? this.formatDuration(video_duration)
          : null,
      },
    };
  }

  async update(id: string, updateLessonDto: UpdateLessonDto) {
    const existingLesson = await this.prisma.lessons.findFirst({
      where: { id, deleted: false },
    });

    if (!existingLesson) {
      throw new NotFoundException('Lesson not found');
    }

    const lesson = await this.prisma.lessons.update({
      where: { id },
      data: {
        ...updateLessonDto,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      data: lesson,
    };
  }

  async reorder(sectionId: string, reorderDto: ReorderLessonsDto) {
    const { lessons } = reorderDto;

    // Verify all lessons belong to the course
    const existingLessons = await this.prisma.lessons.findMany({
      where: {
        id: { in: lessons.map((l) => l.id) },
        section_id: sectionId,
        deleted: false,
      },
    });

    if (existingLessons.length !== lessons.length) {
      throw new BadRequestException(
        'Some lessons do not belong to this section',
      );
    }

    // Update ordering in transaction
    await this.prisma.$transaction(
      lessons.map((lesson) =>
        this.prisma.lessons.update({
          where: { id: lesson.id },
          data: {
            ordering: lesson.ordering,
            updated_at: new Date(),
          },
        }),
      ),
    );

    return {
      success: true,
    };
  }

  async remove(id: string) {
    const lesson = await this.prisma.lessons.findFirst({
      where: { id, deleted: false },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Soft delete lesson
    await this.prisma.$transaction([
      this.prisma.lessons.update({
        where: { id },
        data: { deleted: true, updated_at: new Date() },
      }),

      // Adjust ordering of remaining lessons in the section
      this.prisma.lessons.updateMany({
        where: {
          section_id: lesson.section_id,
          ordering: { gt: lesson.ordering ?? 0 },
          deleted: false,
        },
        data: {
          ordering: { decrement: 1 },
          updated_at: new Date(),
        },
      }),
    ]);

    return {
      success: true,
    };
  }

  async uploadVideo(id: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    try {
      const lesson = await this.prisma.lessons.findFirst({
        where: { id, deleted: false },
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }
      const video_name = lesson.video_url;

      // Upload video using VideoService
      const result = await this.videoService.uploadVideo(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      // Update lesson with video URL
      await this.prisma.lessons.update({
        where: { id },
        data: {
          video_url: result.fileName,
          updated_at: new Date(),
        },
      });

      // delete old video if exists
      if (video_name) {
        await this.videoService.clearVideoData(video_name);
      }

      return {
        success: true,
        message: 'Video uploaded successfully. HLS processing started.',
        data: {
          fileName: result.fileName,
          originalName: result.originalName,
          size: result.size,
          sizeFormatted: this.formatFileSize(result.size),
          mimeType: result.mimeType,
          originalUrl: result.url,
          isProcessing: result.isProcessing,
          estimatedProcessingTime: this.estimateProcessingTime(result.size),
          uploadedAt: new Date().toISOString(),
          statusUrl: `/api/v1/videos/${result.fileName}/status`,
          playerUrl: `/api/v1/videos/${result.fileName}/player`,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getVideoStatus(id: string) {
    try {
      const lesson = await this.prisma.lessons.findFirst({
        where: { id, deleted: false },
      });

      if (!lesson || !lesson.video_url) {
        throw new NotFoundException('Lesson or video not found');
      }
      const fileName = lesson.video_url;
      const hlsUrl = await this.videoService.getVideoHLSUrl(fileName);
      const isProcessed = hlsUrl !== null;
      const progress = await this.videoService.getProgress(fileName);
      const originalInfo =
        await this.videoService.getOriginalVideoInfo(fileName);

      // ✅ Helper function để safely get timestamp
      const getTimestamp = (dateValue: any): number | null => {
        if (!dateValue) return null;

        if (dateValue instanceof Date) {
          return dateValue.getTime();
        }

        if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? null : date.getTime();
        }

        return null;
      };

      // ✅ Calculate elapsed and remaining time safely
      let elapsedTime: number | null = null;
      let remainingTime: number | null = null;

      if (progress?.startTime) {
        const startTimestamp = getTimestamp(progress.startTime);
        if (startTimestamp) {
          elapsedTime = Math.round((Date.now() - startTimestamp) / 1000);
        }
      }

      if (progress?.estimatedCompletion) {
        const completionTimestamp = getTimestamp(progress.estimatedCompletion);
        if (completionTimestamp) {
          remainingTime = Math.max(
            0,
            Math.round((completionTimestamp - Date.now()) / 1000),
          );
        }
      }

      return {
        success: true,
        data: {
          fileName,
          isProcessed,
          hlsUrl,
          originalUrl: originalInfo?.url || null,
          status: isProcessed ? 'ready' : progress ? progress.stage : 'unknown',
          processing: progress
            ? {
                stage: progress.stage,
                progress: progress.progress,
                message: progress.message,
                startTime: progress.startTime,
                estimatedCompletion: progress.estimatedCompletion,
                currentSegment: progress.currentSegment,
                totalSegments: progress.totalSegments,
                uploadedSegments: progress.uploadedSegments,
                error: progress.error,
                elapsedTime, // ✅ Safely calculated
                remainingTime, // ✅ Safely calculated
              }
            : null,
          message: progress
            ? `${progress.message} (${progress.progress}%)`
            : isProcessed
              ? 'Video is ready for streaming'
              : 'Video processing status unknown',
          checkedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds === 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private estimateProcessingTime(fileSize: number): string {
    const minutes = Math.ceil(fileSize / (50 * 1024 * 1024));
    return `${minutes} minute(s)`;
  }

  async findAllBySection(
    sectionId: string,
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    // Verify section exists
    const section = await this.prisma.sections.findFirst({
      where: { id: sectionId, deleted: false },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const whereCondition: Prisma.lessonsWhereInput = {
      section_id: sectionId,
      deleted: false,
      ...this.utilsService.buildWhereFromQuery(rawQuery),
    };

    return this.utilsService.paginate<
      Prisma.lessonsWhereInput,
      Prisma.lessonsInclude,
      Prisma.lessonsSelect,
      Prisma.lessonsOrderByWithRelationInput
    >({
      model: this.prisma.lessons,
      query,
      defaultOrderBy: { ordering: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        lesson_type: true,
        video_url: true,
        video_duration: true,
        document_url: true,
        ordering: true,
        is_preview: true,
        section_id: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }
}
