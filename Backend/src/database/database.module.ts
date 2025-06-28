import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
