import { Module } from '@nestjs/common';
import { FilesModule } from 'src/modules/files/files.module';
import { UsersModule } from 'src/modules/users/users.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
  imports: [UsersModule, UtilsModule, PrismaModule, FilesModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
