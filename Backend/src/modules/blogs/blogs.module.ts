import { Module } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BlogCommentsModule } from '../blog-comments/blog-comments.module';

@Module({
  imports: [PrismaModule, RedisModule, BlogCommentsModule],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
