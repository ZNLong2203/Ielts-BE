import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateScheduleDto } from 'src/modules/study-schedule/dto/create-study-schedule.dto';
import {
  SCHEDULE_STATUS,
  ScheduleStatusType,
} from 'src/modules/study-schedule/types/types';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @ApiProperty({
    description: 'Schedule status',
    enum: SCHEDULE_STATUS,
    required: false,
  })
  @IsEnum(SCHEDULE_STATUS)
  @IsOptional()
  status?: ScheduleStatusType;
}
