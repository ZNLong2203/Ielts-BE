import { Injectable } from '@nestjs/common';
import { CreateGradingDto } from './dto/create-grading.dto';
import { UpdateGradingDto } from './dto/update-grading.dto';

@Injectable()
export class GradingService {
  create(createGradingDto: CreateGradingDto) {
    return 'This action adds a new grading';
  }

  findAll() {
    return `This action returns all grading`;
  }

  findOne(id: number) {
    return `This action returns a #${id} grading`;
  }

  update(id: number, updateGradingDto: UpdateGradingDto) {
    return `This action updates a #${id} grading`;
  }

  remove(id: number) {
    return `This action removes a #${id} grading`;
  }
}
