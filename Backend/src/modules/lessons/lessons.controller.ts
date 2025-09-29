// src/modules/lessons/lessons.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Public } from 'src/decorator/customize';
import {
  CreateLessonDto,
  ReorderLessonsDto,
} from 'src/modules/lessons/dto/create-lesson.dto';
import {
  ApiResponseDto,
  LessonResponseDto,
  VideoUploadStatusDto,
} from 'src/modules/lessons/dto/lesson-response.dto';
import { UpdateLessonDto } from 'src/modules/lessons/dto/update-lesson.dto';
import { LessonsService } from 'src/modules/lessons/lessons.service';

@ApiTags('Lessons')
@Controller('sections/:sectionId/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all lessons in a section',
    description:
      'Retrieve all lessons within a specific section with pagination',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (starts from 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by',
    example: 'ordering',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'asc',
  })
  @ApiQuery({
    name: 'lessonType',
    required: false,
    type: String,
    description: 'Filter by lesson type (video, document, quiz, assignment)',
    example: 'video',
  })
  @ApiQuery({
    name: 'isPreview',
    required: false,
    type: Boolean,
    description: 'Filter by preview status',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lessons retrieved successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        {
          properties: {
            result: {
              type: 'array',
              items: { $ref: '#/components/schemas/LessonResponseDto' },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @Public()
  async findAll(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ): Promise<any> {
    return await this.lessonsService.findAllBySection(
      sectionId,
      query,
      req.query,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new lesson',
    description: 'Create a new lesson within a specific section',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CreateLessonDto })
  @ApiResponse({
    status: 201,
    description: 'Lesson created successfully',
    type: ApiResponseDto<LessonResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @Public()
  create(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.lessonsService.create(createLessonDto, sectionId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get lesson by ID',
    description: 'Retrieve detailed information of a specific lesson',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson retrieved successfully',
    type: ApiResponseDto<LessonResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update lesson',
    description: 'Update lesson information and content',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateLessonDto })
  @ApiResponse({
    status: 200,
    description: 'Lesson updated successfully',
    type: ApiResponseDto<LessonResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @Public()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder lessons',
    description: 'Change the order of lessons within a section',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: ReorderLessonsDto })
  @ApiResponse({
    status: 200,
    description: 'Lessons reordered successfully',
    type: ApiResponseDto<LessonResponseDto[]>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ordering data',
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @Public()
  reorder(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() reorderDto: ReorderLessonsDto,
  ) {
    return this.lessonsService.reorder(sectionId, reorderDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete lesson',
    description: 'Permanently delete a lesson',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @Public()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.remove(id);
  }

  @Post(':id/upload')
  @ApiOperation({
    summary: 'Upload lesson video',
    description: 'Upload a video file for a lesson (max 2GB)',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'Video file (max 2GB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Video upload initiated successfully',
    type: ApiResponseDto<VideoUploadStatusDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file format or size',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @ApiResponse({
    status: 413,
    description: 'File too large - Maximum size is 2GB',
  })
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      },
    }),
  )
  @Public()
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            'video/mp4|video/avi|video/mov|video/wmv|video/flv|video/webm',
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024 * 1024, // 2GB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.lessonsService.uploadVideo(id, file);
  }

  @Get(':id/video-status')
  @ApiOperation({
    summary: 'Get video upload status',
    description: 'Check the status of video upload processing',
  })
  @ApiParam({
    name: 'sectionId',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Video status retrieved successfully',
    type: ApiResponseDto<VideoUploadStatusDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @Public()
  async getVideoStatus(@Param('id', ParseUUIDPipe) id: string) {
    return await this.lessonsService.getVideoStatus(id);
  }
}
