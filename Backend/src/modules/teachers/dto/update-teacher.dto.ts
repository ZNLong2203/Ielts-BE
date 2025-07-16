import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';
import { CreateTeacherDto } from './create-teacher.dto';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}

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
