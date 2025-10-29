import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { CreateReadingExerciseDto } from './dto/create-reading.dto';
import { UpdateReadingExerciseDto } from './dto/update-reading.dto';
import { ReadingService } from './reading.service';

@ApiTags('Reading Exercises')
@ApiBearerAuth()
@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create reading exercise',
    description:
      'Create a new reading exercise with passage in a mock test section',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reading exercise created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test section not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Exercise with this title already exists',
  })
  @Public()
  async createReadingExercise(@Body() createDto: CreateReadingExerciseDto) {
    return this.readingService.createReadingExercise(createDto);
  }

  @Get('test-section/:testSectionId')
  @ApiOperation({
    summary: 'Get reading exercises by test section',
    description: 'Retrieve all reading exercises in a specific test section',
  })
  @ApiParam({
    name: 'testSectionId',
    description: 'Test Section ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercises retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test section not found',
  })
  @Public()
  async getReadingExercisesByTestSection(
    @Param('testSectionId') testSectionId: string,
  ) {
    return this.readingService.getReadingExercisesByTestSection(testSectionId);
  }

  @Get('mock-tests')
  @ApiOperation({
    summary: 'Get all mock tests with reading sections',
    description:
      'Retrieve all mock tests that contain reading sections and their exercises',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock tests with reading sections retrieved successfully',
  })
  @Public()
  async getMockTestsWithReadingSections() {
    return this.readingService.getMockTestsWithReadingSections();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get reading exercise details',
    description:
      'Retrieve detailed information of a reading exercise including passage, question groups, and questions',
  })
  @ApiParam({
    name: 'id',
    description: 'Reading Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercise details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reading exercise not found',
  })
  @Public()
  async getReadingExerciseById(@Param('id') id: string) {
    return this.readingService.getReadingExerciseById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update reading exercise',
    description:
      'Update reading exercise information including passage content',
  })
  @ApiParam({
    name: 'id',
    description: 'Reading Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reading exercise updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reading exercise not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Exercise with this title already exists',
  })
  @Public()
  async updateReadingExercise(
    @Param('id') id: string,
    @Body() updateDto: UpdateReadingExerciseDto,
  ) {
    return this.readingService.updateReadingExercise(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete reading exercise',
    description:
      'Soft delete a reading exercise and all its questions, question groups, and options',
  })
  @ApiParam({
    name: 'id',
    description: 'Reading Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Reading exercise deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reading exercise not found',
  })
  @Public()
  async deleteReadingExercise(@Param('id') id: string) {
    return this.readingService.deleteReadingExercise(id);
  }
}
