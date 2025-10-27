import { Injectable } from '@nestjs/common';
import { CreateMockTestDto } from './dto/create-mock-test.dto';
import { UpdateMockTestDto } from './dto/update-mock-test.dto';

@Injectable()
export class MockTestsService {
  create(createMockTestDto: CreateMockTestDto) {
    return 'This action adds a new mockTest';
  }

  findAll() {
    return `This action returns all mockTests`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mockTest`;
  }

  update(id: number, updateMockTestDto: UpdateMockTestDto) {
    return `This action updates a #${id} mockTest`;
  }

  remove(id: number) {
    return `This action removes a #${id} mockTest`;
  }
}
