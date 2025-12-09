import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TeacherStatsDto {
  @ApiProperty({ description: 'Pending submissions to review' })
  @IsNumber()
  pendingSubmissions: number;

  @ApiProperty({ description: 'Total blogs written' })
  @IsNumber()
  totalBlogs: number;

  @ApiProperty({ description: 'Published blogs' })
  @IsNumber()
  publishedBlogs: number;

  @ApiProperty({ description: 'Blogs written this week' })
  @IsNumber()
  weeklyBlogs: number;

  @ApiProperty({ description: 'Submissions graded this week' })
  @IsNumber()
  weeklyGraded: number;

  @ApiProperty({ description: 'Submissions graded this month' })
  @IsNumber()
  monthlyGraded: number;

  @ApiProperty({ description: 'Blog growth percentage' })
  @IsNumber()
  blogGrowth: number;

  @ApiProperty({ description: 'Grading activity growth percentage' })
  @IsNumber()
  gradingGrowth: number;
}

export class RecentSubmissionDto {
  @ApiProperty({ description: 'Submission ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Student name' })
  @IsString()
  studentName: string;

  @ApiProperty({ description: 'Student avatar', required: false })
  @IsOptional()
  @IsString()
  studentAvatar?: string;

  @ApiProperty({ description: 'Course title' })
  @IsString()
  courseTitle: string;

  @ApiProperty({ description: 'Exercise title' })
  @IsString()
  exerciseTitle: string;

  @ApiProperty({ description: 'Submission type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Submitted at' })
  @IsString()
  submittedAt: string;

  @ApiProperty({ description: 'Status' })
  @IsString()
  status: string;
}

export class TeacherDashboardDto {
  @ApiProperty({ description: 'Teacher statistics' })
  @ValidateNested()
  @Type(() => TeacherStatsDto)
  stats: TeacherStatsDto;

  @ApiProperty({
    description: 'Recent submissions',
    type: [RecentSubmissionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentSubmissionDto)
  recentSubmissions: RecentSubmissionDto[];
}
