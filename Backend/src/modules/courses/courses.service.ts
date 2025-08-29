import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FileType, USER_ROLE } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UploadedFileType } from 'src/interface/file-type.interface';
import { FilesService } from 'src/modules/files/files.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import {
  CreateComboCourseDto,
  CreateCourseCategoryDto,
  CreateCourseDto,
} from './dto/create-course.dto';
import {
  UpdateComboCourseDto,
  UpdateCourseCategoryDto,
  UpdateCourseDto,
} from './dto/update-course.dto';

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

  async findAllCategory(
    includeInactive = false,
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    const whereCondition: Prisma.course_categoriesWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    if (!includeInactive) {
      whereCondition.deleted = false;
      whereCondition.is_active = true;
    }

    return this.utilsService.paginate<
      Prisma.course_categoriesWhereInput,
      Prisma.course_categoriesInclude,
      Prisma.course_categoriesSelect,
      Prisma.course_categoriesOrderByWithRelationInput
    >({
      model: this.prisma.course_categories,
      query,
      defaultOrderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        ordering: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
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
    // Check if admin exists
    const admin = await this.prisma.users.findFirst({
      where: { id: userId, deleted: false },
    });

    if (!admin || admin.role !== USER_ROLE.ADMIN) {
      throw new BadRequestException('Admin profile not found');
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
        category_id: dto.category_id,
        title: dto.title,
        description: dto.description,
        skill_focus: dto.skill_focus,
        difficulty_level: dto.difficulty_level,
        estimated_duration: dto.estimated_duration,
        price: dto.price || 0,
        discount_price: dto.discount_price,
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

  async findById(id: string) {
    const where = {
      id,
      deleted: false,
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
        sections: {
          where: { deleted: false },
          orderBy: { ordering: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            ordering: true,
            lessons: {
              where: { deleted: false },
              orderBy: { ordering: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                lesson_type: true,
                video_duration: true,
                is_preview: true,
                ordering: true,
              },
            },
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
      sections: course.sections,
      created_at: course.created_at,
      updated_at: course.updated_at,
      published_at: course.published_at,
    };
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findById(id); // Check if exists

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
    await this.findById(id); // Check if exists

    return this.prisma.courses.update({
      where: { id },
      data: {
        deleted: true,
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
    const course = await this.findById(id);

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
      rating: course.rating,
      enrollment_count: course.enrollment_count,
      teacher: course.teachers?.users?.full_name,
      teacher_avatar: course.teachers?.users?.avatar,
      category: course.course_categories?.name,
      category_icon: course.course_categories?.icon,
    }));
  }

  async getNewestCourses(limit = 8) {
    return this.prisma.courses.findMany({
      where: {
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

  async findAllComboCourses(
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    const whereCondition: Prisma.combo_coursesWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);
    return this.utilsService.paginate<
      Prisma.combo_coursesWhereInput,
      Prisma.combo_coursesInclude,
      Prisma.combo_coursesSelect,
      Prisma.combo_coursesOrderByWithRelationInput
    >({
      model: this.prisma.combo_courses,
      query,
      defaultOrderBy: { created_at: 'desc' },
      where: whereCondition,
    });
  }
  async findComboCourseById(id: string) {
    const comboCourse = await this.prisma.combo_courses.findFirst({
      where: { id, deleted: false },
    });

    if (!comboCourse) {
      throw new NotFoundException('Combo course not found');
    }

    return comboCourse;
  }
  async createComboCourse(dto: CreateComboCourseDto) {
    const courseIds = dto.course_ids;

    if (!courseIds || courseIds.length === 0) {
      throw new BadRequestException('At least one course must be selected');
    }

    // Check if all courses exist
    const courses = await this.prisma.courses.findMany({
      where: {
        id: { in: courseIds },
        deleted: false,
      },
    });

    if (courses.length !== courseIds.length) {
      throw new BadRequestException(
        'One or more selected courses do not exist',
      );
    }

    return this.prisma.combo_courses.create({
      data: {
        name: dto.name,
        description: dto.description,
        original_price: dto.original_price || 0,
        discount_percentage: dto.discount_percentage || 0,
        combo_price: dto.combo_price || 0,
        tags: dto.tags || [],
        course_ids: dto.course_ids,
      },
    });
  }
  async updateComboCourse(id: string, dto: UpdateComboCourseDto) {
    const comboCourse = await this.findComboCourseById(id);

    // Check if course IDs are provided
    if (dto.course_ids && dto.course_ids.length > 0) {
      // Check if all courses exist
      const courses = await this.prisma.courses.findMany({
        where: {
          id: { in: dto.course_ids },
          deleted: false,
        },
      });

      if (courses.length !== dto.course_ids.length) {
        throw new BadRequestException(
          'One or more selected courses do not exist',
        );
      }
    }

    return this.prisma.combo_courses.update({
      where: { id },
      data: {
        updated_at: new Date(),
        name: dto.name,
        description: dto.description,
        original_price: dto.original_price || 0,
        discount_percentage: dto.discount_percentage || 0,
        combo_price: dto.combo_price || 0,
        tags: dto.tags || [],
        course_ids: dto.course_ids,
      },
    });
  }
  async removeComboCourse(id: string) {
    const comboCourse = await this.findComboCourseById(id);

    return this.prisma.combo_courses.update({
      where: { id },
      data: {
        deleted: true,
        updated_at: new Date(),
      },
    });
  }

  async uploadComboThumbnail(id: string, file: UploadedFileType) {
    const comboCourse = await this.findComboCourseById(id);

    // Upload to storage
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.COURSE_THUMBNAIL,
    );

    // Update combo course thumbnail
    return this.prisma.combo_courses.update({
      where: { id },
      data: {
        thumbnail: fileData.url,
        updated_at: new Date(),
      },
    });
  }
}
