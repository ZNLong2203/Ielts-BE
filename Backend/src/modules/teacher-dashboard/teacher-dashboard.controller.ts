import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, SkipCheckPermission } from '../../decorator/customize';
import { IUser } from '../../interface/users.interface';
import {
  RecentSubmissionDto,
  TeacherDashboardDto,
  TeacherStatsDto,
} from './dto/teacher-dashboard.dto';
import { TeacherDashboardService } from './teacher-dashboard.service';

@ApiTags('Teacher Dashboard')
@ApiBearerAuth()
@Controller('teacher/dashboard')
export class TeacherDashboardController {
  constructor(
    private readonly teacherDashboardService: TeacherDashboardService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get complete teacher dashboard data',
    description:
      'Returns all dashboard data including stats, courses, submissions, and charts',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: TeacherDashboardDto,
  })
  @SkipCheckPermission()
  async getDashboardData(
    @CurrentUser() user: IUser,
  ): Promise<TeacherDashboardDto> {
    return this.teacherDashboardService.getDashboardData(user.id);
  }

  @Get('stats')
  @SkipCheckPermission()
  @ApiOperation({
    summary: 'Get teacher statistics',
    description:
      'Returns key metrics and growth percentages for blogs and grading',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher statistics retrieved successfully',
    type: TeacherStatsDto,
  })
  async getTeacherStats(@CurrentUser() user: IUser): Promise<TeacherStatsDto> {
    return this.teacherDashboardService.getTeacherStats(user.id);
  }

  @Get('submissions')
  @SkipCheckPermission()
  @ApiOperation({
    summary: 'Get recent submissions',
    description: 'Returns recent writing/speaking submissions for review',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent submissions retrieved successfully',
    type: [RecentSubmissionDto],
  })
  async getRecentSubmissions(
    @CurrentUser() user: IUser,
  ): Promise<RecentSubmissionDto[]> {
    return this.teacherDashboardService.getRecentSubmissions(user.id);
  }
}
