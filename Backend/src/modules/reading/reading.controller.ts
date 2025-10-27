// src/modules/reading/reading.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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
}
