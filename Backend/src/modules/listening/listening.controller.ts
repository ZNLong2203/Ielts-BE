import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { CreateListeningDto } from './dto/create-listening.dto';
import { UpdateListeningDto } from './dto/update-listening.dto';

@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Post()
  create(@Body() createListeningDto: CreateListeningDto) {
    return this.listeningService.create(createListeningDto);
  }

  @Get()
  findAll() {
    return this.listeningService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listeningService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateListeningDto: UpdateListeningDto) {
    return this.listeningService.update(+id, updateListeningDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.listeningService.remove(+id);
  }
}
