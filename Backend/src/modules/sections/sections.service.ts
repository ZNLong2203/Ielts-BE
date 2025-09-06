// src/modules/sections/sections.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSectionDto, ReorderSectionsDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSectionDto: CreateSectionDto) {
    const { courseId, ...sectionData } = createSectionDto;

    // Verify course exists
    const course = await this.prisma.courses.findFirst({
      where: { id: courseId, deleted: false },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get next ordering if not provided
    if (sectionData.ordering === undefined) {
      const lastSection = await this.prisma.sections.findFirst({
        where: { course_id: courseId, deleted: false },
        orderBy: { ordering: 'desc' },
      });
      sectionData.ordering = (lastSection?.ordering || 0) + 1;
    }

    const section = await this.prisma.sections.create({
      data: {
        ...sectionData,
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
}
