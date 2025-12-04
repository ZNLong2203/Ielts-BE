import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipCheckPermission } from '../../decorator/customize';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardDto } from './dto/dashboard-stats.dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @SkipCheckPermission()
  @ApiOperation({
    summary: 'Get complete admin dashboard data',
    description:
      'Returns all dashboard data including stats, activities, charts, and top courses',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: AdminDashboardDto,
  })
  async getDashboardData(): Promise<AdminDashboardDto> {
    return this.adminDashboardService.getDashboardData();
  }
}
