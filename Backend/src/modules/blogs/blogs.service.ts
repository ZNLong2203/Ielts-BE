import { Injectable } from '@nestjs/common';
import { blog_categories, blogs, Prisma } from '@prisma/client';
import { FileType, USER_ROLE } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MESSAGE } from 'src/common/message';
import { UploadedFileType } from 'src/interface/file-type.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { UtilsService } from 'src/utils/utils.service';
import { FilesService } from '../files/files.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly filesService: FilesService,
    private readonly utilsService: UtilsService,
    private readonly redisService: RedisService,
  ) {}

  private isValidImageUrl(url: string): boolean {
    const cloudinaryPattern =
      /^https:\/\/res\.cloudinary\.com\/.*\.(jpg|jpeg|png|gif|webp)$/i;
    const generalUrlPattern = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i;

    return cloudinaryPattern.test(url) || generalUrlPattern.test(url);
  }

  private async clearTeacherBlogsCache(teacherId: string): Promise<void> {
    try {
      // Get all keys matching the pattern
      const pattern = `teacherBlogs:${teacherId}:*`;
      const keys = await this.redisService.getClient().keys(pattern);

      if (keys.length > 0) {
        await this.redisService.getClient().del(...keys);
      }

      await this.redisService.del(`teacherBlogs:${teacherId}`);
    } catch (error) {
      console.error('Error clearing teacher blogs cache:', error);
    }
  }

  // CATEGORY METHODS
  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    baseSlug = baseSlug.replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const whereClause: Prisma.blog_categoriesWhereInput = { slug };

      if (excludeId) {
        whereClause.NOT = { id: excludeId };
      }

      const existingCategory =
        await this.prismaService.blog_categories.findFirst({
          where: whereClause,
          select: { id: true },
        });

      if (!existingCategory) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async createBlogCategory(
    createBlogCategoryDto: CreateBlogCategoryDto,
  ): Promise<blog_categories> {
    try {
      const lastCategory = await this.prismaService.blog_categories.findFirst({
        orderBy: { ordering: 'desc' },
        select: { ordering: true },
      });

      const nextOrdering = lastCategory?.ordering
        ? lastCategory.ordering + 1
        : 1;

      // Generate unique slug
      const slug = await this.generateUniqueSlug(createBlogCategoryDto.name);

      const blogCategory = await this.prismaService.blog_categories.create({
        data: {
          ...createBlogCategoryDto,
          slug,
          ordering: nextOrdering,
        },
      });

      await this.redisService.del('allBlogCategories');

      return blogCategory;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findAllBlogCategories(
    query?: PaginationQueryDto,
    rawQuery?: Record<string, any>,
  ) {
    try {
      if (!query) {
        const cachedAllBlogCategories =
          await this.redisService.get('allBlogCategories');
        if (cachedAllBlogCategories) {
          return JSON.parse(cachedAllBlogCategories) as blog_categories[];
        }

        const allBlogCategories =
          await this.prismaService.blog_categories.findMany({
            orderBy: { ordering: 'asc' },
          });

        await this.redisService.set(
          'allBlogCategories',
          JSON.stringify(allBlogCategories),
          3600,
        );

        return allBlogCategories;
      }

      const whereCondition: Prisma.blog_categoriesWhereInput = {
        ...this.utilsService.buildWhereFromQuery(rawQuery || {}),
      };

      return this.utilsService.paginate({
        model: this.prismaService.blog_categories,
        query,
        defaultOrderBy: { ordering: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          ordering: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
        where: whereCondition,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async getDetailBlogCategory(id: string): Promise<blog_categories> {
    try {
      const cachedBlogCategory = await this.redisService.get(
        `blogCategory:${id}`,
      );
      if (cachedBlogCategory) {
        return JSON.parse(cachedBlogCategory) as blog_categories;
      }

      const blogCategory = await this.prismaService.blog_categories.findUnique({
        where: { id },
      });

      if (!blogCategory) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      await this.redisService.set(
        `blogCategory:${id}`,
        JSON.stringify(blogCategory),
        3600,
      );

      return blogCategory;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async getPublicBlogCategoryDetail(id: string): Promise<blog_categories> {
    try {
      const cachedBlogCategory = await this.redisService.get(
        `publicBlogCategory:${id}`,
      );
      if (cachedBlogCategory) {
        return JSON.parse(cachedBlogCategory) as blog_categories;
      }

      const blogCategory = await this.prismaService.blog_categories.findUnique({
        where: {
          id,
          is_active: true,
        },
      });

      if (!blogCategory) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      await this.redisService.set(
        `publicBlogCategory:${id}`,
        JSON.stringify(blogCategory),
        3600,
      );

      return blogCategory;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async updateBlogCategory(
    id: string,
    updateBlogCategoryDto: UpdateBlogCategoryDto,
  ): Promise<blog_categories> {
    try {
      const cachedBlogCategory = await this.redisService.get(
        `blogCategory:${id}`,
      );
      if (cachedBlogCategory) {
        await this.redisService.del(`blogCategory:${id}`);
      }

      await this.redisService.del('allBlogCategories');

      const updateData: Partial<blog_categories> = { ...updateBlogCategoryDto };

      // If name is being updated, regenerate slug
      if (updateBlogCategoryDto.name) {
        const currentCategory =
          await this.prismaService.blog_categories.findUnique({
            where: { id },
            select: { slug: true },
          });

        if (currentCategory) {
          const newSlug = await this.generateUniqueSlug(
            updateBlogCategoryDto.name,
            id, // Exclude current category from slug check
          );

          if (newSlug !== currentCategory.slug) {
            updateData.slug = newSlug;
          }
        }
      }

      const updatedBlogCategory =
        await this.prismaService.blog_categories.update({
          where: { id },
          data: updateData,
        });

      return updatedBlogCategory;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async removeBlogCategory(id: string): Promise<void> {
    try {
      const cachedBlogCategory = await this.redisService.get(
        `blogCategory:${id}`,
      );
      if (cachedBlogCategory) {
        await this.redisService.del(`blogCategory:${id}`);
      }

      await this.redisService.del('allBlogCategories');

      await this.prismaService.blog_categories.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  // PUBLIC BLOG METHODS
  async findAllPublishedBlogs(
    query?: PaginationQueryDto,
    rawQuery?: Record<string, any>,
  ) {
    try {
      if (!query) {
        const cachedBlogs = await this.redisService.get('publishedBlogs');
        if (cachedBlogs) {
          return JSON.parse(cachedBlogs) as blogs[];
        }

        const publishedBlogs = await this.prismaService.blogs.findMany({
          where: { status: 'published' },
          orderBy: { created_at: 'desc' },
        });

        await this.redisService.set(
          'publishedBlogs',
          JSON.stringify(publishedBlogs),
          3600,
        );
        return publishedBlogs;
      }

      // Handle search separately for title/content while keeping generic filters
      const { search, ...restQuery } = rawQuery || {};

      let whereCondition: Prisma.blogsWhereInput = {
        status: 'published',
        deleted: false,
        ...this.utilsService.buildWhereFromQuery(restQuery || {}),
      };

      if (typeof search === 'string' && search.trim().length > 0) {
        const searchTerm = search.trim();

        const searchCondition: Prisma.blogsWhereInput = {
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        };

        // Merge existing OR with search OR if present
        if (Array.isArray(whereCondition.OR) && whereCondition.OR.length > 0) {
          whereCondition = {
            ...whereCondition,
            OR: [...whereCondition.OR, ...searchCondition.OR!],
          };
        } else {
          whereCondition = {
            ...whereCondition,
            ...searchCondition,
          };
        }
      }

      return this.utilsService.paginate({
        model: this.prismaService.blogs,
        query,
        defaultOrderBy: { created_at: 'desc' },
        select: {
          id: true,
          author_id: true,
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
              email: true,
              role: true,
            },
          },
          category_id: true,
          title: true,
          content: true,
          image: true,
          tags: true,
          status: true,
          is_featured: true,
          like_count: true,
          published_at: true,
          created_at: true,
          updated_at: true,
        },
        where: whereCondition,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findPublishedBlogsByCategory(
    categoryId: string,
    query?: PaginationQueryDto,
    rawQuery?: Record<string, any>,
  ) {
    try {
      if (!query) {
        const cachedBlogs = await this.redisService.get(
          `publishedBlogsByCategory:${categoryId}`,
        );
        if (cachedBlogs) {
          return JSON.parse(cachedBlogs) as blogs[];
        }

        const categoryExists =
          await this.prismaService.blog_categories.findUnique({
            where: { id: categoryId },
          });
        if (!categoryExists) {
          throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
        }

        const publishedBlogs = await this.prismaService.blogs.findMany({
          where: {
            category_id: categoryId,
            status: 'published',
          },
          orderBy: { created_at: 'desc' },
        });

        await this.redisService.set(
          `publishedBlogsByCategory:${categoryId}`,
          JSON.stringify(publishedBlogs),
          3600,
        );

        return publishedBlogs;
      }

      const categoryExists =
        await this.prismaService.blog_categories.findUnique({
          where: { id: categoryId },
        });
      if (!categoryExists) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      const whereCondition: Prisma.blogsWhereInput = {
        category_id: categoryId,
        status: 'published',
        deleted: false,
        ...this.utilsService.buildWhereFromQuery(rawQuery || {}),
      };

      return this.utilsService.paginate({
        model: this.prismaService.blogs,
        query,
        defaultOrderBy: { created_at: 'desc' },
        select: {
          id: true,
          author_id: true,
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
              email: true,
              role: true,
            },
          },
          category_id: true,
          title: true,
          content: true,
          image: true,
          tags: true,
          status: true,
          is_featured: true,
          like_count: true,
          published_at: true,
          created_at: true,
          updated_at: true,
        },
        where: whereCondition,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async getFeaturedBlogs(limit = 4) {
    try {
      const featuredBlogs = await this.prismaService.blogs.findMany({
        where: {
          is_featured: true,
          status: 'published',
          deleted: false,
        },
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          author_id: true,
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
              email: true,
              role: true,
            },
          },
          category_id: true,
          title: true,
          content: true,
          image: true,
          tags: true,
          status: true,
          is_featured: true,
          like_count: true,
          published_at: true,
          created_at: true,
          updated_at: true,
        },
      });

      return featuredBlogs;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findPublishedBlogDetail(id: string): Promise<blogs | null> {
    try {
      const cachedBlog = await this.redisService.get(`publishedBlog:${id}`);
      if (cachedBlog) {
        return JSON.parse(cachedBlog) as blogs;
      }

      const blog = await this.prismaService.blogs.findFirst({
        where: {
          id,
          status: 'published',
        },
      });

      if (!blog) {
        return null;
      }

      await this.redisService.set(
        `publishedBlog:${id}`,
        JSON.stringify(blog),
        3600,
      );
      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  // TEACHER BLOG METHODS
  async createTeacherBlog(
    createBlogDto: CreateBlogDto,
    teacherId: string,
    file: UploadedFileType | null = null,
  ): Promise<blogs> {
    try {
      const teacherExists = await this.prismaService.users.findUnique({
        where: { id: teacherId, role: USER_ROLE.TEACHER },
      });

      if (!teacherExists) {
        throw new Error(MESSAGE.BLOG.TEACHER_NOT_FOUND);
      }

      const categoryExists =
        await this.prismaService.blog_categories.findUnique({
          where: { id: createBlogDto.category_id },
        });

      if (!categoryExists) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      if (file == null) {
        throw new Error(MESSAGE.FILES.FILE_NOT_FOUND);
      }

      const fileData = await this.filesService.uploadFile(
        file.buffer,
        file.originalname,
        FileType.BLOG_IMAGE,
      );

      const blog = await this.prismaService.blogs.create({
        data: {
          ...createBlogDto,
          author_id: teacherId,
          image: fileData.url || '',
          status: 'draft',
        },
      });

      await this.clearTeacherBlogsCache(teacherId);
      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del('blogsByStatus:draft');

      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findAllTeacherBlogs(
    teacherId: string,
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    try {
      const cachedBlogs = await this.redisService.get(
        `teacherBlogs:${teacherId}:${JSON.stringify(query)}`,
      );
      if (cachedBlogs) {
        return JSON.parse(cachedBlogs) as blogs[];
      }

      const whereCondition: Prisma.blogsWhereInput = {
        author_id: teacherId,
        deleted: false,
        ...this.utilsService.buildWhereFromQuery(rawQuery),
      };

      const teacherBlogs = await this.utilsService.paginate({
        model: this.prismaService.blogs,
        query,
        defaultOrderBy: { created_at: 'desc' },
        select: {
          id: true,
          author_id: true,
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
              email: true,
              role: true,
            },
          },
          category_id: true,
          title: true,
          content: true,
          image: true,
          tags: true,
          status: true,
          is_featured: true,
          like_count: true,
          published_at: true,
          created_at: true,
          updated_at: true,
        },
        where: whereCondition,
      });

      await this.redisService.set(
        `teacherBlogs:${teacherId}:${JSON.stringify(query)}`,
        JSON.stringify(teacherBlogs),
        3600,
      );

      return teacherBlogs;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findTeacherBlogDetail(
    blogId: string,
    teacherId: string,
  ): Promise<blogs | null> {
    try {
      const blog = await this.prismaService.blogs.findFirst({
        where: {
          id: blogId,
          author_id: teacherId,
        },
      });

      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async updateTeacherBlog(
    blogId: string,
    updateBlogDto: UpdateBlogDto,
    teacherId: string,
    file: UploadedFileType,
  ): Promise<blogs> {
    try {
      const existingBlog = await this.prismaService.blogs.findFirst({
        where: {
          id: blogId,
          author_id: teacherId,
        },
      });

      if (!existingBlog) {
        throw new Error(MESSAGE.BLOG.BLOG_UNAUTHORIZED);
      }

      if (existingBlog.status === 'published') {
        throw new Error(MESSAGE.BLOG.BLOG_CANNOT_EDIT_PUBLISHED);
      }

      if (file) {
        const imageUrl = await this.filesService.uploadFile(
          file.buffer,
          file.originalname,
          FileType.BLOG_IMAGE,
        );

        updateBlogDto.image = imageUrl.url;
      }

      const updatedBlog = await this.prismaService.blogs.update({
        where: { id: blogId },
        data: { ...updateBlogDto },
      });

      await this.clearTeacherBlogsCache(teacherId);
      await this.redisService.del(`blog:${blogId}`);
      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del(`blogsByStatus:${existingBlog.status}`);
      if (
        updateBlogDto.category_id &&
        existingBlog.category_id !== updateBlogDto.category_id
      ) {
        await this.redisService.del(
          `publishedBlogsByCategory:${existingBlog.category_id}`,
        );
        await this.redisService.del(
          `publishedBlogsByCategory:${updateBlogDto.category_id}`,
        );
      }

      return updatedBlog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async deleteTeacherBlog(blogId: string, teacherId: string): Promise<void> {
    try {
      const existingBlog = await this.prismaService.blogs.findFirst({
        where: {
          id: blogId,
          author_id: teacherId,
        },
      });

      if (!existingBlog) {
        throw new Error(MESSAGE.BLOG.BLOG_UNAUTHORIZED);
      }

      await this.prismaService.blogs.delete({
        where: { id: blogId },
      });

      await this.clearTeacherBlogsCache(teacherId);
      await this.redisService.del(`blog:${blogId}`);
      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del(`blogsByStatus:${existingBlog.status}`);
      if (existingBlog.status === 'published') {
        await this.redisService.del('publishedBlogs');
        await this.redisService.del(`publishedBlog:${blogId}`);
        if (existingBlog.category_id) {
          await this.redisService.del(
            `publishedBlogsByCategory:${existingBlog.category_id}`,
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  // ADMIN BLOG METHODS
  async findAllBlogsForAdmin(
    query?: PaginationQueryDto,
    rawQuery?: Record<string, any>,
  ) {
    try {
      if (!query) {
        const cachedBlogs = await this.redisService.get('allBlogsAdmin');
        if (cachedBlogs) {
          return JSON.parse(cachedBlogs) as blogs[];
        }

        const allBlogs = await this.prismaService.blogs.findMany({
          orderBy: { created_at: 'desc' },
        });

        await this.redisService.set(
          'allBlogsAdmin',
          JSON.stringify(allBlogs),
          3600,
        );
        return allBlogs;
      }

      const whereCondition: Prisma.blogsWhereInput = {
        deleted: false,
        ...this.utilsService.buildWhereFromQuery(rawQuery || {}),
      };

      return this.utilsService.paginate({
        model: this.prismaService.blogs,
        query,
        defaultOrderBy: { created_at: 'desc' },
        select: {
          id: true,
          author_id: true,
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
              email: true,
              role: true,
            },
          },
          category_id: true,
          title: true,
          content: true,
          image: true,
          tags: true,
          status: true,
          is_featured: true,
          like_count: true,
          published_at: true,
          created_at: true,
          updated_at: true,
        },
        where: whereCondition,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findBlogsByStatus(
    status: string,
    query?: PaginationQueryDto,
    rawQuery?: Record<string, any>,
  ) {
    try {
      if (!query) {
        const cachedBlogs = await this.redisService.get(
          `blogsByStatus:${status}`,
        );
        if (cachedBlogs) {
          return JSON.parse(cachedBlogs) as blogs[];
        }

        const blogs = await this.prismaService.blogs.findMany({
          where: { status },
          orderBy: { created_at: 'desc' },
        });

        await this.redisService.set(
          `blogsByStatus:${status}`,
          JSON.stringify(blogs),
          3600,
        );
        return blogs;
      }

      const whereCondition: Prisma.blogsWhereInput = {
        status,
        deleted: false,
        ...this.utilsService.buildWhereFromQuery(rawQuery || {}),
      };

      return this.utilsService.paginate({
        model: this.prismaService.blogs,
        query,
        defaultOrderBy: { created_at: 'desc' },
        select: {
          id: true,
          author_id: true,
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
              email: true,
              role: true,
            },
          },
          category_id: true,
          title: true,
          content: true,
          image: true,
          tags: true,
          status: true,
          is_featured: true,
          like_count: true,
          published_at: true,
          created_at: true,
          updated_at: true,
        },
        where: whereCondition,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findBlogDetailForAdmin(id: string): Promise<blogs | null> {
    try {
      const blog = await this.prismaService.blogs.findUnique({
        where: { id },
      });

      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async createBlogByAdmin(
    createBlogDto: CreateBlogDto,
    adminId: string,
    file: UploadedFileType | null = null,
  ): Promise<blogs> {
    try {
      const categoryExists =
        await this.prismaService.blog_categories.findUnique({
          where: { id: createBlogDto.category_id },
        });

      if (!categoryExists) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      let imageUrl = '';
      if (file) {
        const fileData = await this.filesService.uploadFile(
          file.buffer,
          file.originalname,
          FileType.BLOG_IMAGE,
        );
        imageUrl = fileData.url || '';
      } else if (
        createBlogDto.image &&
        this.isValidImageUrl(createBlogDto.image)
      ) {
        imageUrl = createBlogDto.image;
      }

      const blog = await this.prismaService.blogs.create({
        data: {
          ...createBlogDto,
          author_id: adminId,
          image: imageUrl,
          status: 'published',
          published_at: new Date(),
        },
      });

      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del('publishedBlogs');
      await this.redisService.del('blogsByStatus:published');
      await this.redisService.del(
        `publishedBlogsByCategory:${createBlogDto.category_id}`,
      );

      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async updateBlogStatus(id: string, status: string): Promise<blogs> {
    try {
      const updatedBlog = await this.prismaService.blogs.update({
        where: { id },
        data: {
          status,
          published_at: status === 'published' ? new Date() : null,
        },
      });

      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del('publishedBlogs');
      await this.redisService.del(`blogsByStatus:draft`);
      await this.redisService.del(`blogsByStatus:published`);
      await this.redisService.del(`blogsByStatus:archived`);
      await this.redisService.del(`blog:${id}`);
      await this.redisService.del(`publishedBlog:${id}`);

      return updatedBlog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async updateBlogByAdmin(
    id: string,
    updateBlogDto: UpdateBlogDto,
    file: UploadedFileType,
  ): Promise<blogs> {
    try {
      const existingBlog = await this.prismaService.blogs.findUnique({
        where: { id },
        select: { category_id: true, status: true, author_id: true },
      });

      if (!existingBlog) {
        throw new Error(MESSAGE.BLOG.BLOG_NOT_FOUND);
      }

      if (file) {
        const imageUrl = await this.filesService.uploadFile(
          file.buffer,
          file.originalname,
          FileType.BLOG_IMAGE,
        );

        updateBlogDto.image = imageUrl.url;
      }

      const updatedBlog = await this.prismaService.blogs.update({
        where: { id },
        data: { ...updateBlogDto },
      });

      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del(`blog:${id}`);
      await this.redisService.del(`blogsByStatus:${existingBlog.status}`);
      if (existingBlog.author_id) {
        await this.clearTeacherBlogsCache(existingBlog.author_id);
      }

      if (existingBlog.status === 'published') {
        await this.redisService.del('publishedBlogs');
        await this.redisService.del(`publishedBlog:${id}`);
      }

      if (
        updateBlogDto.category_id &&
        existingBlog.category_id !== updateBlogDto.category_id
      ) {
        await this.redisService.del(
          `publishedBlogsByCategory:${existingBlog.category_id}`,
        );
        await this.redisService.del(
          `publishedBlogsByCategory:${updateBlogDto.category_id}`,
        );
      }

      return updatedBlog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async deleteBlogByAdmin(id: string): Promise<void> {
    try {
      const existingBlog = await this.prismaService.blogs.findUnique({
        where: { id },
        select: { category_id: true, status: true, author_id: true },
      });

      if (!existingBlog) {
        throw new Error(MESSAGE.BLOG.BLOG_NOT_FOUND);
      }

      await this.prismaService.blogs.delete({
        where: { id },
      });

      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del(`blog:${id}`);
      await this.redisService.del(`blogsByStatus:${existingBlog.status}`);

      if (existingBlog.author_id) {
        await this.clearTeacherBlogsCache(existingBlog.author_id);
      }

      if (existingBlog.status === 'published') {
        await this.redisService.del('publishedBlogs');
        await this.redisService.del(`publishedBlog:${id}`);
        if (existingBlog.category_id) {
          await this.redisService.del(
            `publishedBlogsByCategory:${existingBlog.category_id}`,
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }
}
