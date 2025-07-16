import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  TEACHER_SPECIALIZATION,
  TEACHER_STATUS,
  TeacherSpecialization,
  TeacherStatus,
} from 'src/common/constants';
import { CreateTeacherDto } from './create-teacher.dto';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
  @ApiProperty({
    description: 'Teacher qualifications and education background',
  })
  qualification: string;

  @ApiProperty({ description: 'Years of teaching experience' })
  experience_years: number;

  @ApiProperty({
    enum: TEACHER_SPECIALIZATION,
    isArray: true,
    example: [TEACHER_SPECIALIZATION.READING, TEACHER_SPECIALIZATION.SPEAKING],
    description: 'Teacher specializations',
  })
  specializations: TeacherSpecialization[];

  @ApiProperty({
    description: "Teacher's IELTS band score",
    type: 'number',
    minimum: 0,
    maximum: 9,
    example: 8.5,
  })
  ielts_band_score: number;

  @ApiPropertyOptional({ description: "Teacher's approach to teaching" })
  teaching_style?: string;

  @ApiProperty({
    description: 'Hourly rate for teaching',
    minimum: 0,
    example: 250000,
  })
  hourly_rate: number;
}

export class UpdateTeacherStatusDto {
  @ApiProperty({
    enum: TEACHER_STATUS,
    description: 'Status of the teacher',
  })
  @IsEnum(TEACHER_STATUS, {
    message: `Status must be one of the following: ${Object.values(TEACHER_STATUS).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: TeacherStatus;
}

class TimeSlot {
  @ApiProperty({ description: 'Start time', example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM',
  })
  start: string;

  @ApiProperty({ description: 'End time', example: '17:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM',
  })
  end: string;
}

export class UpdateAvailabilityDto {
  @ApiProperty({
    description: 'Schedule availability by day of week',
    example: {
      monday: [
        { start: '08:00', end: '12:00' },
        { start: '14:00', end: '18:00' },
      ],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '08:00', end: '12:00' }],
      thursday: [{ start: '14:00', end: '20:00' }],
      friday: [{ start: '08:00', end: '15:00' }],
    },
  })
  @IsNotEmpty()
  @Transform(
    ({ value }): Record<string, Array<{ start: string; end: string }>> => {
      if (typeof value === 'string') {
        // Cast explicit type to JSON.parse result
        return JSON.parse(value) as Record<
          string,
          Array<{ start: string; end: string }>
        >;
      }
      return value;
    },
  )
  @ValidateNested({ each: true })
  @Type(() => TimeSlot)
  availability: Record<string, TimeSlot[]>;
}
