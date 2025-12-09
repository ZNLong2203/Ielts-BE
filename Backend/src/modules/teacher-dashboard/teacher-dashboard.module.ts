import { Module } from '@nestjs/common';
import { CaslModule } from '../../casl/casl.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { TeacherDashboardController } from './teacher-dashboard.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [TeacherDashboardController],
  providers: [TeacherDashboardService],
  exports: [TeacherDashboardService],
})
export class TeacherDashboardModule {}
