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

  async findBlogByCategoryId(categoryId: string): Promise<blogs[]> {
    try {
      const cachedBlogsByCategory = await this.redisService.get(
        `blogsByCategory:${categoryId}`,
      );
      if (cachedBlogsByCategory) {
        return JSON.parse(cachedBlogsByCategory) as blogs[];
      }

      const categoryExists =
        await this.prismaService.blog_categories.findUnique({
          where: { id: categoryId },
        });
      if (!categoryExists) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      const blogsByCategory = await this.prismaService.blogs.findMany({
        where: { category_id: categoryId },
        orderBy: { created_at: 'desc' },
      });

      await this.redisService.set(
        `blogsByCategory:${categoryId}`,
        JSON.stringify(blogsByCategory),
        3600,
      );

      return blogsByCategory;
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

  async createBlog(createBlogDto: CreateBlogDto): Promise<blogs> {
    try {
      const authorExists = await this.prismaService.users.findUnique({
        where: { id: createBlogDto.author_id },
      });

      if (!authorExists) {
        throw new Error(MESSAGE.ERROR.USER_NOT_FOUND);
      }

      const categoryExists =
        await this.prismaService.blog_categories.findUnique({
          where: { id: createBlogDto.category_id },
        });

      if (!categoryExists) {
        throw new Error(MESSAGE.BLOG.BLOG_CATEGORY_NOT_FOUND);
      }

      if (createBlogDto.image && !this.isValidImageUrl(createBlogDto.image)) {
        throw new Error('Invalid image URL format');
      }

      const blog = await this.prismaService.blogs.create({
        data: {
          ...createBlogDto,
          image: createBlogDto.image || '',
        },
      });

      await this.redisService.del('allBlogs');
      if (createBlogDto.category_id) {
        await this.redisService.del(
          `blogsByCategory:${createBlogDto.category_id}`,
        );
      }

      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findAllBlogs(): Promise<blogs[]> {
    try {
      const cachedBlogs = await this.redisService.get('allBlogs');
      if (cachedBlogs) {
        return JSON.parse(cachedBlogs) as blogs[];
      }

      const allBlogs = await this.prismaService.blogs.findMany({
        orderBy: { created_at: 'desc' },
      });
      await this.redisService.set('allBlogs', JSON.stringify(allBlogs), 3600);

      return allBlogs;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findOneBlog(id: string): Promise<blogs | null> {
    try {
      const cachedBlogs = await this.redisService.get(`blog:${id}`);
      if (cachedBlogs) {
        return JSON.parse(cachedBlogs) as blogs;
      }

      const blog = await this.prismaService.blogs.findUnique({
        where: { id },
      });
      if (!blog) {
        return null;
      }

      await this.redisService.set(`blog:${id}`, JSON.stringify(blog), 3600);

      return blog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async updateBlog(id: string, updateBlogDto: UpdateBlogDto): Promise<blogs> {
    try {
      const existingBlog = await this.prismaService.blogs.findUnique({
        where: { id },
        select: { category_id: true },
      });

      const updatedBlog = await this.prismaService.blogs.update({
        where: { id },
        data: { ...updateBlogDto },
      });

      await this.redisService.set(
        `blog:${id}`,
        JSON.stringify(updatedBlog),
        3600,
      );

      await this.redisService.del('allBlogs');

      if (
        existingBlog?.category_id &&
        updateBlogDto.category_id &&
        existingBlog.category_id !== updateBlogDto.category_id
      ) {
        await this.redisService.del(
          `blogsByCategory:${existingBlog.category_id}`,
        );
      }

      if (updateBlogDto.category_id) {
        await this.redisService.del(
          `blogsByCategory:${updateBlogDto.category_id}`,
        );
      }

      return updatedBlog;
    } catch (error) {
      try {
        await this.redisService.del(`blog:${id}`);
        await this.redisService.del('allBlogs');
      } catch (cacheError) {
        console.error('Cache cleanup failed:', cacheError);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async removeBlog(id: string): Promise<void> {
    try {
      const existingBlog = await this.prismaService.blogs.findUnique({
        where: { id },
        select: { category_id: true },
      });

      const cachedBlog = await this.redisService.get(`blog:${id}`);
      if (cachedBlog) {
        await this.redisService.del(`blog:${id}`);
      }

      await this.redisService.del('allBlogs');
      if (existingBlog?.category_id) {
        await this.redisService.del(
          `blogsByCategory:${existingBlog.category_id}`,
        );
      }

      await this.prismaService.blogs.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }
}
