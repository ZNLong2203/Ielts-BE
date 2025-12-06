import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
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
import { CertificatesService } from 'src/modules/certificates/certificates.service';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
    private readonly utilsService: UtilsService,
    private readonly certificatesService: CertificatesService,
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

      // Helper function để safely get timestamp
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

      // Calculate elapsed and remaining time safely
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
                elapsedTime, // Safely calculated
                remainingTime, // Safely calculated
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

    return this.utilsService.paginate({
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

  async markLessonComplete(
    userId: string,
    lessonId: string,
    courseId: string,
    sectionId: string,
  ) {
    // Verify lesson exists
    const lesson = await this.prisma.lessons.findFirst({
      where: { id: lessonId, deleted: false },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Verify course and section exist
    const course = await this.prisma.courses.findFirst({
      where: { id: courseId, deleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const section = await this.prisma.sections.findFirst({
      where: { id: sectionId, deleted: false, course_id: courseId },
    });

    if (!section) {
      throw new NotFoundException(
        'Section not found or does not belong to course',
      );
    }

    // Check if user is enrolled in the course
    const enrollment = await this.prisma.enrollments.findFirst({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted: false,
        is_active: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    const now = new Date();

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (tx) => {
      // 1. Update or create user_progress for lesson
      await tx.user_progress.upsert({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        create: {
          user_id: userId,
          course_id: courseId,
          section_id: sectionId,
          lesson_id: lessonId,
          status: 'completed',
          progress_percentage: 100,
          completion_date: now,
        },
        update: {
          status: 'completed',
          progress_percentage: 100,
          completion_date: now,
          updated_at: now,
        },
      });

      // 2. Update section_progress
      // Count total lessons in section
      const totalLessons = await tx.lessons.count({
        where: {
          section_id: sectionId,
          deleted: false,
        },
      });

      // Count completed lessons in section for this user
      const completedLessons = await tx.user_progress.count({
        where: {
          user_id: userId,
          section_id: sectionId,
          status: 'completed',
          deleted: false,
        },
      });

      const sectionProgressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      await tx.section_progress.upsert({
        where: {
          user_id_section_id: {
            user_id: userId,
            section_id: sectionId,
          },
        },
        create: {
          user_id: userId,
          course_id: courseId,
          section_id: sectionId,
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
          progress_percentage: sectionProgressPercentage,
          started_at: completedLessons === 1 ? now : undefined,
          completed_at: completedLessons === totalLessons ? now : undefined,
          updated_at: now,
        },
        update: {
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
          progress_percentage: sectionProgressPercentage,
          completed_at: completedLessons === totalLessons ? now : undefined,
          updated_at: now,
        },
      });

      // 3. Update enrollment progress
      // Count total lessons in course
      const courseSections = await tx.sections.findMany({
        where: {
          course_id: courseId,
          deleted: false,
        },
        include: {
          lessons: {
            where: {
              deleted: false,
            },
          },
        },
      });

      const totalCourseLessons = courseSections.reduce(
        (acc, section) => acc + section.lessons.length,
        0,
      );

      // Count completed lessons in course for this user
      const completedCourseLessons = await tx.user_progress.count({
        where: {
          user_id: userId,
          course_id: courseId,
          status: 'completed',
          deleted: false,
        },
      });

      const courseProgressPercentage =
        totalCourseLessons > 0
          ? (completedCourseLessons / totalCourseLessons) * 100
          : 0;

      await tx.enrollments.update({
        where: { id: enrollment.id },
        data: {
          progress_percentage: courseProgressPercentage,
          completion_date:
            completedCourseLessons === totalCourseLessons ? now : undefined,
          updated_at: now,
        },
      });

      // 4. Update combo progress if course is part of a combo
      // Find all combo enrollments that contain this course
      const comboEnrollments = await tx.combo_enrollments.findMany({
        where: {
          user_id: userId,
          deleted: false,
          is_active: true,
        },
        include: {
          combo_courses: true,
        },
      });

      // Update progress for each combo that contains this course
      for (const comboEnrollment of comboEnrollments) {
        const courseIds = comboEnrollment.combo_courses?.course_ids as string[];

        if (!courseIds || !courseIds.includes(courseId)) {
          continue;
        }

        // Count completed courses in this combo
        // A course is completed when all its lessons are completed
        const comboCourseEnrollments = await tx.enrollments.findMany({
          where: {
            user_id: userId,
            course_id: { in: courseIds },
            deleted: false,
          },
          include: {
            courses: {
              include: {
                sections: {
                  include: {
                    lessons: {
                      where: {
                        deleted: false,
                      },
                    },
                  },
                  where: {
                    deleted: false,
                  },
                },
              },
            },
          },
        });

        // Calculate overall progress as average of all course progress percentages
        // This gives a more accurate representation than just counting completed courses
        let totalProgress = 0;

        for (const courseEnrollment of comboCourseEnrollments) {
          const course = courseEnrollment.courses;
          if (!course) continue;

          const totalLessons = course.sections.reduce(
            (acc, section) => acc + section.lessons.length,
            0,
          );

          const completedLessons = await tx.user_progress.count({
            where: {
              user_id: userId,
              course_id: course.id,
              status: 'completed',
              deleted: false,
            },
          });

          // Calculate course progress percentage
          const courseProgress =
            totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

          totalProgress += courseProgress;
        }

        // Overall progress is the average of all course progress percentages
        const overallProgress =
          comboCourseEnrollments.length > 0
            ? totalProgress / comboCourseEnrollments.length
            : 0;

        const updatedEnrollment = await tx.combo_enrollments.update({
          where: { id: comboEnrollment.id },
          data: {
            overall_progress_percentage: overallProgress,
            updated_at: now,
          },
        });

        // Auto-generate certificate if combo reaches 100% and certificate doesn't exist
        if (
          overallProgress >= 100 &&
          !updatedEnrollment.certificate_url
        ) {
          // Generate certificate asynchronously to avoid blocking
          this.generateCertificateAsync(
            userId,
            comboEnrollment.id,
          ).catch((error) => {
            this.logger.error(
              `Failed to auto-generate certificate for combo enrollment ${comboEnrollment.id}:`,
              error,
            );
          });
        }
      }
    });

    return {
      success: true,
      message: 'Lesson marked as completed and progress updated successfully',
    };
  }

  private async generateCertificateAsync(
    userId: string,
    comboEnrollmentId: string,
  ): Promise<void> {
    try {
      await this.certificatesService.generateCertificate(userId, {
        combo_enrollment_id: comboEnrollmentId,
      });
      this.logger.log(
        `Certificate auto-generated for combo enrollment ${comboEnrollmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error auto-generating certificate: ${error.message}`,
        error.stack,
      );
      // Don't throw - certificate generation failure shouldn't block lesson completion
    }
  }

  async getUserLessonProgress(userId: string, lessonId: string) {
    const progress = await this.prisma.user_progress.findFirst({
      where: {
        user_id: userId,
        lesson_id: lessonId,
        deleted: false,
      },
    });

    return {
      success: true,
      data: {
        lesson_id: lessonId,
        status: progress?.status || 'not_started',
        progress_percentage: progress?.progress_percentage
          ? Number(progress.progress_percentage)
          : 0,
        completion_date: progress?.completion_date || null,
        is_completed: progress?.status === 'completed',
      },
    };
  }
}
