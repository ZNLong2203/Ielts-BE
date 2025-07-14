import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [DatabaseService, PrismaService],
  exports: [DatabaseService, PrismaService],
})
export class DatabaseModule {}
