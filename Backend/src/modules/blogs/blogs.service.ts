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
      const allBlogCategories =
        await this.prismaService.blog_categories.findMany({
          orderBy: { ordering: 'asc' },
        });

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
      const blogsByCategory = await this.prismaService.blogs.findMany({
        where: { category_id: categoryId },
        orderBy: { created_at: 'desc' },
      });

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

      const blog = await this.prismaService.blogs.create({
        data: {
          ...createBlogDto,
          image: createBlogDto.image || '',
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
      const cachedBlog = await this.redisService.get(`blog:${id}`);
      if (cachedBlog) {
        await this.redisService.del(`blog:${id}`);
      }

      const updatedBlog = await this.prismaService.blogs.update({
        where: { id },
        data: { ...updateBlogDto },
      });

      return updatedBlog;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async removeBlog(id: string): Promise<void> {
    try {
      const cachedBlog = await this.redisService.get(`blog:${id}`);
      if (cachedBlog) {
        await this.redisService.del(`blog:${id}`);
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
