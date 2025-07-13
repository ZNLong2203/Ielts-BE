import { Injectable } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { blogs } from '@prisma/client';

@Injectable()
export class BlogsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(createBlogDto: CreateBlogDto): Promise<blogs> {
    const blog = await this.prismaService.blogs.create({
      data: {
        ...createBlogDto,
        slug: createBlogDto.slug || '',
        featured_image: createBlogDto.featured_image || '',
      },
    });
    return blog;
  }

  async findAll(): Promise<blogs[]> {
    const allBlogs = await this.prismaService.blogs.findMany();
    return allBlogs;
  }

  async findOne(id: string): Promise<blogs | null> {
    const blog = await this.prismaService.blogs.findUnique({
      where: { id },
    });

    return blog;
  }

  async update(id: string, updateBlogDto: UpdateBlogDto): Promise<blogs> {
    const updatedBlog = await this.prismaService.blogs.update({
      where: { id },
      data: { ...updateBlogDto },
    });

    return updatedBlog;
  }

  async remove(id: string): Promise<void> {
    await this.prismaService.blogs.delete({
      where: { id },
    });
  }
}
