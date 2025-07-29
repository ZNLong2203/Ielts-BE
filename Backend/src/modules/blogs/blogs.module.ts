import { Module, forwardRef } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BlogCommentsModule } from '../blog-comments/blog-comments.module';
import { CaslModule } from 'src/casl/casl.module';
import { FilesModule } from '../files/files.module';
import { UtilsModule } from 'src/utils/utils.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    FilesModule,
    UtilsModule,
    CaslModule,
    forwardRef(() => BlogCommentsModule),
  ],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
