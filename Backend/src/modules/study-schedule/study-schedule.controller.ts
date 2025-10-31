import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StudyScheduleService } from './study-schedule.service';
import { CreateStudyScheduleDto } from './dto/create-study-schedule.dto';
import { UpdateStudyScheduleDto } from './dto/update-study-schedule.dto';

@Controller('study-schedule')
export class StudyScheduleController {
  constructor(private readonly studyScheduleService: StudyScheduleService) {}

  @Post()
  create(@Body() createStudyScheduleDto: CreateStudyScheduleDto) {
    return this.studyScheduleService.create(createStudyScheduleDto);
  }

  @Get()
  findAll() {
    return this.studyScheduleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studyScheduleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudyScheduleDto: UpdateStudyScheduleDto) {
    return this.studyScheduleService.update(+id, updateStudyScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studyScheduleService.remove(+id);
  }
}
