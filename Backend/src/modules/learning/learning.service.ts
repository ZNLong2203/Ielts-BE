import { Injectable } from '@nestjs/common';
import { CreateLearningDto } from './dto/create-learning.dto';
import { UpdateLearningDto } from './dto/update-learning.dto';

@Injectable()
export class LearningService {
  create(createLearningDto: CreateLearningDto) {
    return 'This action adds a new learning';
  }

  findAll() {
    return `This action returns all learning`;
  }

  findOne(id: number) {
    return `This action returns a #${id} learning`;
  }

  update(id: number, updateLearningDto: UpdateLearningDto) {
    return `This action updates a #${id} learning`;
  }

  remove(id: number) {
    return `This action removes a #${id} learning`;
  }
}
