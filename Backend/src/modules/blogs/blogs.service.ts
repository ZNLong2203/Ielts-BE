import { Injectable } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { blogs, blog_categories } from '@prisma/client';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { MESSAGE } from 'src/common/message';

@Injectable()
export class BlogsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private isValidImageUrl(url: string): boolean {
    const cloudinaryPattern =
      /^https:\/\/res\.cloudinary\.com\/.*\.(jpg|jpeg|png|gif|webp)$/i;
    const generalUrlPattern = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i;

    return cloudinaryPattern.test(url) || generalUrlPattern.test(url);
  }

  // CATEGORY METHODS
  async createBlogCategory(
    createBlogCategoryDto: CreateBlogCategoryDto,
  ): Promise<blog_categories> {
    try {
      const blogCategory = await this.prismaService.blog_categories.create({
        data: {
          ...createBlogCategoryDto,
          slug: createBlogCategoryDto.name.toLowerCase().replace(/\s+/g, '-'),
        },
      });

      return blogCategory;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findAllBlogCategories(): Promise<blog_categories[]> {
    try {
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

      const updatedBlogCategory =
        await this.prismaService.blog_categories.update({
          where: { id },
          data: {
            ...updateBlogCategoryDto,
          },
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
  async findAllPublishedBlogs(): Promise<blogs[]> {
    try {
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
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findPublishedBlogsByCategory(categoryId: string): Promise<blogs[]> {
    try {
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

  // ========== TEACHER BLOG METHODS ==========
  async createTeacherBlog(
    createBlogDto: CreateBlogDto,
    teacherId: string,
  ): Promise<blogs> {
    try {
      const teacherExists = await this.prismaService.users.findUnique({
        where: { id: teacherId, role: 'teacher' },
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

      if (createBlogDto.image && !this.isValidImageUrl(createBlogDto.image)) {
        throw new Error(MESSAGE.BLOG.INVALID_IMAGE_URL);
      }

      const blog = await this.prismaService.blogs.create({
        data: {
          ...createBlogDto,
          author_id: teacherId,
          image: createBlogDto.image || '',
          status: 'draft',
        },
      });

      await this.redisService.del(`teacherBlogs:${teacherId}`);
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

  async findAllTeacherBlogs(teacherId: string): Promise<blogs[]> {
    try {
      const cachedBlogs = await this.redisService.get(
        `teacherBlogs:${teacherId}`,
      );
      if (cachedBlogs) {
        return JSON.parse(cachedBlogs) as blogs[];
      }

      const teacherBlogs = await this.prismaService.blogs.findMany({
        where: { author_id: teacherId },
        orderBy: { created_at: 'desc' },
      });

      await this.redisService.set(
        `teacherBlogs:${teacherId}`,
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

      if (updateBlogDto.image && !this.isValidImageUrl(updateBlogDto.image)) {
        throw new Error(MESSAGE.BLOG.INVALID_IMAGE_URL);
      }

      const updatedBlog = await this.prismaService.blogs.update({
        where: { id: blogId },
        data: { ...updateBlogDto },
      });

      await this.redisService.del(`teacherBlogs:${teacherId}`);
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

      await this.redisService.del(`teacherBlogs:${teacherId}`);
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
  async findAllBlogsForAdmin(): Promise<blogs[]> {
    try {
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
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findBlogsByStatus(status: string): Promise<blogs[]> {
    try {
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
  ): Promise<blogs> {
    try {
      const existingBlog = await this.prismaService.blogs.findUnique({
        where: { id },
        select: { category_id: true, status: true, author_id: true },
      });

      if (!existingBlog) {
        throw new Error(MESSAGE.BLOG.BLOG_NOT_FOUND);
      }

      if (updateBlogDto.image && !this.isValidImageUrl(updateBlogDto.image)) {
        throw new Error(MESSAGE.BLOG.INVALID_IMAGE_URL);
      }

      const updatedBlog = await this.prismaService.blogs.update({
        where: { id },
        data: { ...updateBlogDto },
      });

      await this.redisService.del('allBlogsAdmin');
      await this.redisService.del(`blog:${id}`);
      await this.redisService.del(`blogsByStatus:${existingBlog.status}`);
      if (existingBlog.author_id) {
        await this.redisService.del(`teacherBlogs:${existingBlog.author_id}`);
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
        await this.redisService.del(`teacherBlogs:${existingBlog.author_id}`);
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
