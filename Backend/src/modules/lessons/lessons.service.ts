import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateLessonDto,
  ReorderLessonsDto,
} from 'src/modules/lessons/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/modules/lessons/dto/update-lesson.dto';
import { VideoService } from 'src/modules/video/video.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
  ) {}

  async create(createLessonDto: CreateLessonDto) {
    const { sectionId, ...lessonData } = createLessonDto;

    // Verify section exists
    const section = await this.prisma.sections.findFirst({
      where: { id: sectionId, deleted: false },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Get next ordering if not provided
    if (lessonData.ordering === undefined) {
      const lastLesson = await this.prisma.lessons.findFirst({
        where: { section_id: sectionId, deleted: false },
        orderBy: { ordering: 'desc' },
      });
      lessonData.ordering = (lastLesson?.ordering || 0) + 1;
    }

    const lesson = await this.prisma.lessons.create({
      data: {
        ...lessonData,
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
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    let hlsUrl: string | null = 'No video';
    if (lesson.video_url) {
      hlsUrl = await this.videoService.getVideoHLSUrl(lesson.video_url);
    }

    return {
      success: true,
      data: { ...lesson, hlsUrl },
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
          video_duration: Math.floor(result.size / (1024 * 1024)), // Dummy duration based on size
          updated_at: new Date(),
        },
      });

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
}
