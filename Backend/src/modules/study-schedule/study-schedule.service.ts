import { Injectable } from '@nestjs/common';
import { CreateStudyScheduleDto } from './dto/create-study-schedule.dto';
import { UpdateStudyScheduleDto } from './dto/update-study-schedule.dto';

@Injectable()
export class StudyScheduleService {
  create(createStudyScheduleDto: CreateStudyScheduleDto) {
    return 'This action adds a new studySchedule';
  }

  findAll() {
    return `This action returns all studySchedule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} studySchedule`;
  }

  update(id: number, updateStudyScheduleDto: UpdateStudyScheduleDto) {
    return `This action updates a #${id} studySchedule`;
  }

  remove(id: number) {
    return `This action removes a #${id} studySchedule`;
  }
}
