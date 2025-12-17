import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import { CreateSectionDto, ReorderSectionsDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  async create(createSectionDto: CreateSectionDto, courseId: string) {
    // Verify course exists
    const course = await this.prisma.courses.findFirst({
      where: { id: courseId, deleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get next ordering if not provided
    if (createSectionDto.ordering === undefined) {
      const lastSection = await this.prisma.sections.findFirst({
        where: { course_id: courseId, deleted: false },
        orderBy: { ordering: 'desc' },
      });
      createSectionDto.ordering = (lastSection?.ordering || 0) + 1;
    }

    const section = await this.prisma.sections.create({
      data: {
        ...createSectionDto,
        course_id: courseId,
      },
    });

    return {
      success: true,
      data: section,
    };
  }

  async findOne(id: string) {
    const section = await this.prisma.sections.findFirst({
      where: { id, deleted: false },
      include: {
        courses: {
          select: {
            id: true,
            title: true,
          },
        },
        lessons: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return {
      success: true,
      data: section,
    };
  }

  async update(id: string, updateSectionDto: UpdateSectionDto) {
    const existingSection = await this.prisma.sections.findFirst({
      where: { id, deleted: false },
    });

    if (!existingSection) {
      throw new NotFoundException('Section not found');
    }

    const section = await this.prisma.sections.update({
      where: { id },
      data: {
        ...updateSectionDto,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      data: section,
    };
  }

  async reorder(courseId: string, reorderDto: ReorderSectionsDto) {
    const { sections } = reorderDto;

    // Verify all sections belong to the course
    const existingSections = await this.prisma.sections.findMany({
      where: {
        id: { in: sections.map((s) => s.id) },
        course_id: courseId,
        deleted: false,
      },
    });

    if (existingSections.length !== sections.length) {
      throw new BadRequestException(
        'Some sections do not belong to this course',
      );
    }

    // Update ordering in transaction
    await this.prisma.$transaction(
      sections.map((section) =>
        this.prisma.sections.update({
          where: { id: section.id },
          data: {
            ordering: section.ordering,
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
    const section = await this.prisma.sections.findFirst({
      where: { id, deleted: false },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Soft delete section and its lessons
    await this.prisma.$transaction([
      this.prisma.lessons.updateMany({
        where: { section_id: id },
        data: { deleted: true, updated_at: new Date() },
      }),
      this.prisma.sections.update({
        where: { id },
        data: { deleted: true, updated_at: new Date() },
      }),

      // Optionally, reorder remaining sections in the course
      this.prisma.sections.updateMany({
        where: {
          course_id: section.course_id,
          deleted: false,
          ordering: { gt: section.ordering ?? 0 },
        },
        data: {
          ordering: {
            decrement: 1,
          },
          updated_at: new Date(),
        },
      }),
    ]);

    return {
      success: true,
    };
  }

  async findAllByCourse(
    courseId: string,
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    // Verify course exists
    const course = await this.prisma.courses.findFirst({
      where: { id: courseId, deleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const whereCondition: Prisma.sectionsWhereInput = {
      course_id: courseId,
      deleted: false,
      ...this.utilsService.buildWhereFromQuery(rawQuery),
    };

    return this.utilsService.paginate({
      model: this.prisma.sections,
      query,
      defaultOrderBy: { ordering: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        ordering: true,
        course_id: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  async getSectionProgress(userId: string, sectionId: string) {
    // Verify section exists
    const section = await this.prisma.sections.findFirst({
      where: { id: sectionId, deleted: false },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Get section progress
    const sectionProgress = await this.prisma.section_progress.findFirst({
      where: {
        user_id: userId,
        section_id: sectionId,
        deleted: false,
      },
    });

    // Count total lessons in section
    const totalLessons = await this.prisma.lessons.count({
      where: {
        section_id: sectionId,
        deleted: false,
      },
    });

    // Count completed lessons if no progress record exists
    const completedLessons = sectionProgress
      ? sectionProgress.completed_lessons || 0
      : await this.prisma.user_progress.count({
          where: {
            user_id: userId,
            section_id: sectionId,
            status: 'completed',
            deleted: false,
          },
        });

    const progressPercentage = sectionProgress
      ? Number(sectionProgress.progress_percentage || 0)
      : totalLessons > 0
        ? (completedLessons / totalLessons) * 100
        : 0;

    return {
      success: true,
      data: {
        section_id: sectionId,
        progress_percentage: progressPercentage,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        is_completed: sectionProgress?.completed_at !== null,
        completed_at: sectionProgress?.completed_at || null,
      },
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    // Verify course exists
    const course = await this.prisma.courses.findFirst({
      where: { id: courseId, deleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get enrollment
    const enrollment = await this.prisma.enrollments.findFirst({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted: false,
        is_active: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('User is not enrolled in this course');
    }

    // Get all sections with lessons
    const sections = await this.prisma.sections.findMany({
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

    const totalLessons = sections.reduce(
      (acc, section) => acc + section.lessons.length,
      0,
    );

    // Count completed lessons
    const completedLessons = await this.prisma.user_progress.count({
      where: {
        user_id: userId,
        course_id: courseId,
        status: 'completed',
        deleted: false,
      },
    });

    const progressPercentage = enrollment.progress_percentage
      ? Number(enrollment.progress_percentage)
      : totalLessons > 0
        ? (completedLessons / totalLessons) * 100
        : 0;

    // Course is completed when all lessons are completed
    // This is the most reliable indicator since lesson count can change
    const isCompleted = totalLessons > 0 && completedLessons === totalLessons;

    return {
      success: true,
      data: {
        course_id: courseId,
        progress_percentage: progressPercentage,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        is_completed: isCompleted,
        completion_date: enrollment.completion_date || null,
      },
    };
  }
}
