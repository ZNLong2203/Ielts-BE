import { Injectable } from '@nestjs/common';
import { CreateListeningDto } from './dto/create-listening.dto';
import { UpdateListeningDto } from './dto/update-listening.dto';

@Injectable()
export class ListeningService {
  create(createListeningDto: CreateListeningDto) {
    return 'This action adds a new listening';
  }

  findAll() {
    return `This action returns all listening`;
  }

  findOne(id: number) {
    return `This action returns a #${id} listening`;
  }

  update(id: number, updateListeningDto: UpdateListeningDto) {
    return `This action updates a #${id} listening`;
  }

  remove(id: number) {
    return `This action removes a #${id} listening`;
  }
}
