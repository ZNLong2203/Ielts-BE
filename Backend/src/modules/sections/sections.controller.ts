// src/modules/sections/sections.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from 'src/decorator/customize';
import { CreateSectionDto, ReorderSectionsDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionsService } from './sections.service';

@Controller('courses/:courseId/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @Public()
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() createSectionDto: CreateSectionDto,
  ) {
    return this.sectionsService.create({
      ...createSectionDto,
      courseId,
    });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, updateSectionDto);
  }

  @Patch('reorder')
  @Public()
  reorder(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() reorderDto: ReorderSectionsDto,
  ) {
    return this.sectionsService.reorder(courseId, reorderDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.remove(id);
  }
}
