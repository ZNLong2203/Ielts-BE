import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FileType } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilesService } from 'src/modules/files/files.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import {
  CreateCourseCategoryDto,
  CreateCourseDto,
} from './dto/create-course.dto';
import {
  UpdateCourseCategoryDto,
  UpdateCourseDto,
} from './dto/update-course.dto';
import { UploadedFileType } from 'src/interface/file-type.interface';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly utilsService: UtilsService,
  ) {}

  async createCategory(dto: CreateCourseCategoryDto) {
    return this.prisma.course_categories.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        ordering: dto.ordering || 0,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async findAllCategory(includeInactive = false) {
    const where = includeInactive
      ? { deleted: false }
      : { deleted: false, is_active: true };

    return this.prisma.course_categories.findMany({
      where,
      orderBy: { ordering: 'asc' },
    });
  }

  async findByIdCategory(id: string) {
    const category = await this.prisma.course_categories.findFirst({
      where: { id, deleted: false },
    });

    if (!category) {
      throw new NotFoundException('Course category not found');
    }

    return category;
  }

  async updateCategory(id: string, dto: UpdateCourseCategoryDto) {
    await this.findById(id); // Check if exists

    const updatedData: Prisma.course_categoriesUpdateInput =
      this.utilsService.cleanDto(dto);

    return this.prisma.course_categories.update({
      where: { id },
      data: {
        ...updatedData,
        updated_at: new Date(),
      },
    });
  }

  async removeCategory(id: string) {
    await this.findByIdCategory(id); // Check if exists

    return this.prisma.course_categories.update({
      where: { id },
      data: {
        deleted: true,
        is_active: false,
        updated_at: new Date(),
      },
    });
  }

  async getCourseCountByCategory() {
    const categories = await this.prisma.course_categories.findMany({
      where: { deleted: false, is_active: true },
      select: {
        id: true,
        name: true,
      },
    });

    const results = await Promise.all(
      categories.map(async (category) => {
        const count = await this.prisma.courses.count({
          where: {
            category_id: category.id,
            deleted: false,
            is_published: true,
          },
        });

        return {
          id: category.id,
          name: category.name,
          courseCount: count,
        };
      }),
    );

    return results;
  }

  async create(dto: CreateCourseDto, userId: string) {
    // Check if teacher exists
    const teacher = await this.prisma.teachers.findFirst({
      where: { user_id: userId, deleted: false },
    });

    if (!teacher) {
      throw new BadRequestException('Teacher profile not found');
    }

    // Check if category exists if provided
    if (dto.category_id) {
      const category = await this.prisma.course_categories.findFirst({
        where: { id: dto.category_id, deleted: false, is_active: true },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    return this.prisma.courses.create({
      data: {
        teacher_id: teacher.id,
        category_id: dto.category_id,
        title: dto.title,
        description: dto.description,
        thumbnail: dto.thumbnail,
        skill_focus: dto.skill_focus,
        difficulty_level: dto.difficulty_level,
        estimated_duration: dto.estimated_duration,
        price: dto.price || 0,
        discount_price: dto.discount_price,
        is_free: dto.is_free || false,
        is_published: false, // Default to false, needs explicit publishing
        is_featured: false, // Default to false, only admin can feature
        requirements: dto.requirements,
        what_you_learn: dto.what_you_learn,
        course_outline: dto.course_outline,
        tags: dto.tags,
      },
    });
  }

  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.coursesWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    return this.utilsService.paginate<
      Prisma.coursesWhereInput,
      Prisma.coursesInclude,
      Prisma.coursesSelect,
      Prisma.coursesOrderByWithRelationInput
    >({
      model: this.prisma.courses,
      query,
      defaultOrderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        difficulty_level: true,
        estimated_duration: true,
        price: true,
        discount_price: true,
        is_free: true,
        is_published: true,
        is_featured: true,
        rating: true,
        rating_count: true,
        created_at: true,
        updated_at: true,
        published_at: true,
      },
      where: whereCondition,
    });
  }

  async findById(id: string, includeUnpublished = false) {
    const where = {
      id,
      deleted: false,
      ...(includeUnpublished ? {} : { is_published: true }),
    };

    const course = await this.prisma.courses.findFirst({
      where,
      include: {
        teachers: {
          select: {
            id: true,
            qualification: true,
            experience_years: true,
            rating: true,
            users: {
              select: {
                id: true,
                full_name: true,
                avatar: true,
              },
            },
          },
        },
        course_categories: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        lessons: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            video_duration: true,
            is_preview: true,
            is_published: true,
            ordering: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Format response
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      skill_focus: course.skill_focus,
      difficulty_level: course.difficulty_level,
      estimated_duration: course.estimated_duration,
      price: course.price,
      discount_price: course.discount_price,
      is_free: course.is_free,
      is_published: course.is_published,
      is_featured: course.is_featured,
      enrollment_count: course.enrollment_count,
      rating: course.rating,
      rating_count: course.rating_count,
      requirements: course.requirements,
      what_you_learn: course.what_you_learn,
      course_outline: course.course_outline,
      tags: course.tags,
      teacher: course.teachers
        ? {
            id: course.teachers.id,
            name: course.teachers.users?.full_name,
            avatar: course.teachers.users?.avatar,
            qualification: course.teachers.qualification,
            experience_years: course.teachers.experience_years,
            rating: course.teachers.rating,
          }
        : null,
      category: course.course_categories
        ? {
            id: course.course_categories.id,
            name: course.course_categories.name,
            icon: course.course_categories.icon,
          }
        : null,
      lessons: course.lessons,
      created_at: course.created_at,
      updated_at: course.updated_at,
      published_at: course.published_at,
    };
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findById(id, true); // Check if exists

    // Check if category exists if provided
    if (dto.category_id) {
      const category = await this.prisma.course_categories.findFirst({
        where: { id: dto.category_id, deleted: false, is_active: true },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    // Clean DTO to remove undefined values
    const updatedData: Prisma.coursesUpdateInput =
      this.utilsService.cleanDto(dto);

    return this.prisma.courses.update({
      where: { id },
      data: {
        ...updatedData,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id, true); // Check if exists

    return this.prisma.courses.update({
      where: { id },
      data: {
        deleted: true,
        updated_at: new Date(),
      },
    });
  }

  async publishCourse(id: string, isPublished: boolean) {
    const course = await this.findById(id, true);

    // Check if course has lessons
    const lessonCount = await this.prisma.lessons.count({
      where: { course_id: id, deleted: false },
    });

    if (isPublished && lessonCount === 0) {
      throw new BadRequestException('Cannot publish course without lessons');
    }

    return this.prisma.courses.update({
      where: { id },
      data: {
        is_published: isPublished,
        published_at: isPublished ? new Date() : null,
        updated_at: new Date(),
      },
    });
  }

  async featureCourse(id: string, isFeatured: boolean) {
    const course = await this.findById(id);

    return this.prisma.courses.update({
      where: { id },
      data: {
        is_featured: isFeatured,
        updated_at: new Date(),
      },
    });
  }

  async uploadThumbnail(id: string, file: UploadedFileType) {
    const course = await this.findById(id, true);

    // Upload to storage
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.COURSE_THUMBNAIL,
    );

    // Update course thumbnail
    return this.prisma.courses.update({
      where: { id },
      data: {
        thumbnail: fileData.url,
        updated_at: new Date(),
      },
    });
  }

  async getTeacherCourses(
    teacherId: string,
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    const whereCondition: Prisma.coursesWhereInput = {
      teacher_id: teacherId,
      deleted: false,
      ...this.utilsService.buildWhereFromQuery(rawQuery),
    };

    return this.utilsService.paginate<
      Prisma.coursesWhereInput,
      Prisma.coursesInclude,
      Prisma.coursesSelect,
      Prisma.coursesOrderByWithRelationInput
    >({
      model: this.prisma.courses,
      query,
      defaultOrderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        price: true,
        discount_price: true,
        is_free: true,
        rating: true,
        enrollment_count: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  async getFeaturedCourses(limit = 8) {
    const courses = await this.prisma.courses.findMany({
      where: {
        is_featured: true,
        is_published: true,
        deleted: false,
      },
      take: limit,
      orderBy: { rating: 'desc' },
      include: {
        teachers: {
          select: {
            users: {
              select: {
                full_name: true,
                avatar: true,
              },
            },
          },
        },
        course_categories: {
          select: {
            name: true,
            icon: true,
          },
        },
      },
    });

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      thumbnail: course.thumbnail,
      price: course.price,
      discount_price: course.discount_price,
      is_free: course.is_free,
      rating: course.rating,
      enrollment_count: course.enrollment_count,
      teacher: course.teachers?.users?.full_name,
      teacher_avatar: course.teachers?.users?.avatar,
      category: course.course_categories?.name,
      category_icon: course.course_categories?.icon,
    }));
  }

  async getPopularCourses(limit = 8) {
    return this.prisma.courses.findMany({
      where: {
        is_published: true,
        deleted: false,
      },
      take: limit,
      orderBy: [{ enrollment_count: 'desc' }, { rating: 'desc' }],
      include: {
        teachers: {
          select: {
            users: {
              select: {
                full_name: true,
                avatar: true,
              },
            },
          },
        },
        course_categories: {
          select: {
            name: true,
            icon: true,
          },
        },
      },
    });
  }

  async getNewestCourses(limit = 8) {
    return this.prisma.courses.findMany({
      where: {
        is_published: true,
        deleted: false,
      },
      take: limit,
      orderBy: { published_at: 'desc' },
      include: {
        teachers: {
          select: {
            users: {
              select: {
                full_name: true,
                avatar: true,
              },
            },
          },
        },
        course_categories: {
          select: {
            name: true,
            icon: true,
          },
        },
      },
    });
  }
}
