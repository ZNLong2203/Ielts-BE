import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Combo ID (if studying from a combo)',
    example: 'combo-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  combo_id?: string;

  @ApiProperty({
    description: 'Course ID',
    example: 'course-uuid-456',
  })
  @IsString()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({
    description: 'Lesson ID (optional - for specific lesson)',
    example: 'lesson-uuid-789',
    required: false,
  })
  @IsString()
  @IsOptional()
  lesson_id?: string;

  @ApiProperty({
    description: 'Scheduled date (YYYY-MM-DD)',
    example: '2025-11-05',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduled_date: string;

  @ApiProperty({
    description: 'Start time (HH:mm format)',
    example: '19:00',
  })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({
    description: 'End time (HH:mm format)',
    example: '21:00',
  })
  @IsString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({
    description: 'Study goal for this session',
    example: 'Complete Section 2: Reading Strategies',
    required: false,
  })
  @IsString()
  @IsOptional()
  study_goal?: string;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Enable reminder',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  reminder_enabled?: boolean;

  @ApiProperty({
    description: 'Reminder time before session (in minutes)',
    example: 30,
    default: 30,
    minimum: 5,
    maximum: 120,
  })
  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(120)
  reminder_minutes_before?: number;
}

export class CompleteScheduleDto {
  @ApiProperty({
    description: 'Completion percentage',
    example: 100,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  completion_percentage: number;
}

class TimeSlotDto {
  @ApiProperty({
    description: 'Day of week',
    example: 'monday',
  })
  @IsString()
  @IsNotEmpty()
  day: string;

  @ApiProperty({
    description: 'Start time (HH:mm)',
    example: '19:00',
  })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({
    description: 'End time (HH:mm)',
    example: '21:00',
  })
  @IsString()
  @IsNotEmpty()
  end_time: string;
}

export class BulkCreateScheduleDto {
  @ApiProperty({
    description: 'Combo ID',
    example: 'combo-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  combo_id: string;

  @ApiProperty({
    description: 'Number of weeks to schedule',
    example: 12,
    minimum: 1,
    maximum: 52,
  })
  @IsInt()
  @Min(1)
  @Max(52)
  weeks_count: number;

  @ApiProperty({
    description: 'Preferred time slots',
    type: [TimeSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  time_slots: TimeSlotDto[];

  @ApiProperty({
    description: 'Enable reminders for all sessions',
    example: true,
    default: true,
  })
  @IsOptional()
  reminder_enabled?: boolean;

  @ApiProperty({
    description: 'Reminder time before session (in minutes)',
    example: 30,
    default: 30,
  })
  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(120)
  reminder_minutes_before?: number;
}
