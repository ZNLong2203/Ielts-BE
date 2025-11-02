import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GradingService } from './grading.service';
import { CreateGradingDto } from './dto/create-grading.dto';
import { UpdateGradingDto } from './dto/update-grading.dto';

@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post()
  create(@Body() createGradingDto: CreateGradingDto) {
    return this.gradingService.create(createGradingDto);
  }

  @Get()
  findAll() {
    return this.gradingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gradingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGradingDto: UpdateGradingDto) {
    return this.gradingService.update(+id, updateGradingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gradingService.remove(+id);
  }
}
