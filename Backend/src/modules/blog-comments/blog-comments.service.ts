import { Injectable } from '@nestjs/common';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { blog_comments } from '@prisma/client';
import { MESSAGE } from 'src/common/message';

@Injectable()
export class BlogCommentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async createBlogComment(
    createBlogCommentDto: CreateBlogCommentDto,
    blog_id: string,
    user_id: string,
  ): Promise<blog_comments> {
    try {
      const blogComment = await this.prismaService.blog_comments.create({
        data: {
          ...createBlogCommentDto,
          blog_id,
          user_id,
        },
      });

      await this.redisService.del(`blog_comments:${blog_id}`);

      return blogComment;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async createReplyInComment(
    blog_id: string,
    comment_id: string,
    createBlogCommentDto: CreateBlogCommentDto,
    user_id: string,
  ): Promise<blog_comments> {
    try {
      const reply = await this.prismaService.blog_comments.create({
        data: {
          ...createBlogCommentDto,
          blog_id,
          parent_comment_id: comment_id,
          user_id,
        },
      });

      await this.redisService.del(`blog_comments:${blog_id}`);
      await this.redisService.del(`blog_comment:${blog_id}:${comment_id}`);

      return reply;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findAllBlogComments(blog_id: string): Promise<blog_comments[]> {
    try {
      const cachedComments = await this.redisService.get(
        `blog_comments:${blog_id}`,
      );
      if (cachedComments) {
        return JSON.parse(cachedComments) as blog_comments[];
      }

      const allBlogComments = await this.prismaService.blog_comments.findMany({
        where: { blog_id: blog_id },
        orderBy: { created_at: 'desc' },
      });

      await this.redisService.set(
        `blog_comments:${blog_id}`,
        JSON.stringify(allBlogComments),
        3600,
      );

      return allBlogComments;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async findReplyInComment(
    blog_id: string,
    comment_id: string,
  ): Promise<blog_comments[] | null> {
    try {
      const cachedComment = await this.redisService.get(
        `blog_comment:${blog_id}:${comment_id}`,
      );
      if (cachedComment) {
        return JSON.parse(cachedComment) as blog_comments[];
      }

      const replies = await this.prismaService.blog_comments.findMany({
        where: {
          blog_id: blog_id,
          parent_comment_id: comment_id,
        },
      });
      if (replies.length === 0) {
        return null;
      }

      await this.redisService.set(
        `blog_comment:${blog_id}:${comment_id}`,
        JSON.stringify(replies),
        3600,
      );

      return replies;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }

  async deleteBlogComment(
    blog_id: string,
    comment_id: string,
    user_id: string,
  ): Promise<void> {
    try {
      const comment = await this.prismaService.blog_comments.findUnique({
        where: {
          id: comment_id,
          blog_id: blog_id,
        },
      });
      if (!comment) {
        throw new Error(MESSAGE.BLOG_COMMENT.COMMENT_NOT_FOUND);
      }
      if (comment.user_id !== user_id) {
        throw new Error(MESSAGE.BLOG_COMMENT.COMMENT_UNAUTHORIZED);
      }

      await this.prismaService.blog_comments.delete({
        where: { id: comment.id, blog_id: comment.blog_id },
      });

      await this.redisService.del(`blog_comments:${comment.blog_id}`);
      await this.redisService.del(
        `blog_comment:${comment.blog_id}:${comment.id}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(MESSAGE.ERROR.UNEXPECTED_ERROR);
    }
  }
}
