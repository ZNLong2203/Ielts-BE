import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
