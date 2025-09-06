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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/decorator/customize';
import {
  CreateLessonDto,
  ReorderLessonsDto,
} from 'src/modules/lessons/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/modules/lessons/dto/update-lesson.dto';
import { LessonsService } from 'src/modules/lessons/lessons.service';

@Controller('sections/:sectionId/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Public()
  create(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.lessonsService.create({
      ...createLessonDto,
      sectionId,
    });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Patch('reorder')
  @Public()
  reorder(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() reorderDto: ReorderLessonsDto,
  ) {
    return this.lessonsService.reorder(sectionId, reorderDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.remove(id);
  }

  @Post(':id/upload')
  @Public()
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.lessonsService.uploadVideo(id, file);
  }

  @Get(':id/video-status')
  @Public()
  async getVideoStatus(@Param('id', ParseUUIDPipe) id: string) {
    return await this.lessonsService.getVideoStatus(id);
  }
}
