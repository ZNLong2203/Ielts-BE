// src/modules/reading/reading.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessageResponse, Public } from 'src/decorator/customize';
import { CreateReadingExerciseDto } from 'src/modules/reading/dto/create-reading.dto';
import { UpdateReadingExerciseDto } from 'src/modules/reading/dto/update-reading.dto';
import { ReadingService } from './reading.service';

@ApiTags('📚 Reading Exercises')
@Controller('reading/exercises')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  /**
   * 📚 Create Reading Exercise in Test Section
   */
  @Post()
  @ApiOperation({
    summary: 'Create reading exercise in test section',
    description:
      'Creates a new reading exercise with passage content in a test section',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reading exercise created successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test section not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Exercise with this title already exists in test section',
  })
  async createReadingExercise(
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreateReadingExerciseDto,
  ) {
    const exercise = await this.readingService.createReadingExercise(createDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Reading exercise created successfully',
      data: exercise,
    };
  }

  /**
   * 📖 Get Reading Exercises by Test Section
   */
  @Get('test-sections/:testSectionId')
  @ApiOperation({
    summary: 'Get reading exercises by test section',
    description:
      'Retrieves all reading exercises in a specific test section with pagination',
  })
  @ApiParam({
    name: 'testSectionId',
    description: 'Test section UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercises retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test section not found',
  })
  async getExercisesByTestSection(
    @Param('testSectionId', ParseUUIDPipe) testSectionId: string,
  ) {
    const result =
      await this.readingService.getReadingExercisesByTestSection(testSectionId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Reading exercises retrieved successfully',
      ...result,
    };
  }

  /**
   * 🔍 Get Reading Exercise by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get reading exercise by ID',
    description:
      'Retrieves detailed information about a reading exercise including questions',
  })
  @ApiParam({
    name: 'id',
    description: 'Exercise UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercise retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reading exercise not found',
  })
  async getReadingExerciseById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.readingService.getReadingExerciseById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Reading exercise retrieved successfully',
      data: result,
    };
  }

  /**
   * ✏️ Update Reading Exercise
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update reading exercise',
    description:
      'Updates reading exercise information including passage content',
  })
  @ApiParam({
    name: 'id',
    description: 'Exercise UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercise updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reading exercise not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Exercise with this title already exists in test section',
  })
  async updateReadingExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true }))
    updateDto: UpdateReadingExerciseDto,
  ) {
    const exercise = await this.readingService.updateReadingExercise(
      id,
      updateDto,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Reading exercise updated successfully',
      data: exercise,
    };
  }

  /**
   * 🗑️ Delete Reading Exercise
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete reading exercise',
    description: 'Soft deletes a reading exercise and all its questions',
  })
  @ApiParam({
    name: 'id',
    description: 'Exercise UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercise deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reading exercise not found',
  })
  async deleteReadingExercise(@Param('id', ParseUUIDPipe) id: string) {
    await this.readingService.deleteReadingExercise(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Reading exercise deleted successfully',
    };
  }

  /**
   * 📊 Get All Mock Tests with Reading Sections
   */
  @Get()
  @ApiOperation({
    summary: 'Get all mock tests with reading sections',
    description:
      'Retrieves all mock tests that contain reading sections with their exercises',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock tests with reading sections retrieved successfully',
  })
  async getMockTestsWithReadingSections() {
    const data = await this.readingService.getMockTestsWithReadingSections();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Mock tests with reading sections retrieved successfully',
      data,
    };
  }

  /**
   * Upload image for question
   */
  @Post(':exerciseId/question/:questionId/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload question image',
    description:
      'Upload an image for a question. Supports JPEG, PNG, JPG, GIF, and WebP formats. Max file size: 2MB. Replaces existing image if any.',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiParam({
    name: 'questionId',
    description: 'Question ID to upload image for',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, JPG, GIF, WebP - Max 2MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            image_url: {
              type: 'string',
              example: 'https://example.com/exercises/image.jpg',
            },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid file type or file size exceeds limit',
  })
  @Public()
  @MessageResponse('Question image uploaded successfully')
  async uploadExerciseImage(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg|image/gif|image/webp',
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024, // 2MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    const exercise = await this.readingService.uploadQuestionImage(
      questionId,
      file,
    );

    return {
      success: true,
      data: exercise,
    };
  }
}
