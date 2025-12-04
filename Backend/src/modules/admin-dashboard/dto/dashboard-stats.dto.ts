import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DashboardStatsDto {
  @ApiProperty({ description: 'Total number of users' })
  @IsNumber()
  totalUsers: number;

  @ApiProperty({ description: 'Total number of courses' })
  @IsNumber()
  totalCourses: number;

  @ApiProperty({ description: 'Total number of mock tests' })
  @IsNumber()
  totalMockTests: number;

  @ApiProperty({ description: 'Total revenue amount' })
  @IsNumber()
  totalRevenue: number;

  @ApiProperty({ description: 'New users today' })
  @IsNumber()
  todayNewUsers: number;

  @ApiProperty({ description: 'Tests completed today' })
  @IsNumber()
  todayTestsCompleted: number;

  @ApiProperty({ description: 'Course enrollments today' })
  @IsNumber()
  todayEnrollments: number;

  @ApiProperty({ description: 'Revenue generated today' })
  @IsNumber()
  todayRevenue: number;

  @ApiProperty({ description: 'User growth percentage' })
  @IsNumber()
  userGrowth: number;

  @ApiProperty({ description: 'Course growth percentage' })
  @IsNumber()
  courseGrowth: number;

  @ApiProperty({ description: 'Mock test growth percentage' })
  @IsNumber()
  mockTestGrowth: number;

  @ApiProperty({ description: 'Revenue growth percentage' })
  @IsNumber()
  revenueGrowth: number;
}

export class RecentActivityUserDto {
  @ApiProperty({ description: 'User name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class RecentActivityDto {
  @ApiProperty({
    description: 'Activity type',
    enum: [
      'user_registered',
      'course_created',
      'mocktest_completed',
      'payment_received',
    ],
  })
  @IsString()
  type:
    | 'user_registered'
    | 'course_created'
    | 'mocktest_completed'
    | 'payment_received';

  @ApiProperty({ description: 'Activity title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Activity description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Activity timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({
    description: 'User associated with activity',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecentActivityUserDto)
  user?: RecentActivityUserDto;

  @ApiProperty({
    description: 'Amount for payment activities',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class ChartDataPointDto {
  @ApiProperty({ description: 'Data point name/label' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Data point value' })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Data point label for display' })
  @IsString()
  label: string;
}

export class TopCourseDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Course title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Course thumbnail URL', required: false })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ description: 'Number of enrollments' })
  @IsNumber()
  enrollments: number;

  @ApiProperty({ description: 'Course rating' })
  @IsNumber()
  rating: number;

  @ApiProperty({ description: 'Course revenue' })
  @IsNumber()
  revenue: number;
}

export class AdminDashboardDto {
  @ApiProperty({ description: 'Dashboard statistics' })
  @ValidateNested()
  @Type(() => DashboardStatsDto)
  stats: DashboardStatsDto;

  @ApiProperty({ description: 'Recent activities', type: [RecentActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentActivityDto)
  recentActivities: RecentActivityDto[];

  @ApiProperty({
    description: 'User growth chart data',
    type: [ChartDataPointDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChartDataPointDto)
  userGrowthChart: ChartDataPointDto[];

  @ApiProperty({ description: 'Revenue chart data', type: [ChartDataPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChartDataPointDto)
  revenueChart: ChartDataPointDto[];

  @ApiProperty({ description: 'Top courses', type: [TopCourseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopCourseDto)
  topCourses: TopCourseDto[];
}
