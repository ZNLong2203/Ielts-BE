import { Module } from '@nestjs/common';
import { BlogCommentsService } from './blog-comments.service';
import { BlogCommentsController } from './blog-comments.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { BlogsModule } from '../blogs/blogs.module';

@Module({
  imports: [PrismaModule, RedisModule, BlogsModule],
  controllers: [BlogCommentsController],
  providers: [BlogCommentsService],
  exports: [BlogCommentsService],
})
export class BlogCommentsModule {}
