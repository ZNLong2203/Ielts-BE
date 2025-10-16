// src/modules/lessons/controllers/exercise.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessageResponse, Public } from 'src/decorator/customize';
import { CreateExerciseDto } from 'src/modules/exercises/dto/create-exercise.dto';
import {
  ExerciseResponseDto,
  UpdateExerciseDto,
} from 'src/modules/exercises/dto/update-exercise.dto';
import { ExerciseService } from 'src/modules/exercises/exercises.service';
import { ApiResponseDto } from 'src/modules/sections/dto/section-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('Lesson Exercises')
@Controller('lessons/:lessonId/exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  /**
   * ✅ Create exercise
   */
  @Post()
  @ApiOperation({
    summary: 'Create exercise for lesson',
    description: 'Create a new exercise with questions for a specific lesson',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CreateExerciseDto })
  @ApiResponse({
    status: 201,
    description: 'Exercise created successfully',
    type: ApiResponseDto<ExerciseResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid exercise data',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @Public()
  @MessageResponse('Exercise created successfully')
  async createExercise(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() createDto: CreateExerciseDto,
  ) {
    // Override lesson_id from URL param
    createDto.lesson_id = lessonId;
    const exercise = await this.exerciseService.createExercise(createDto);

    return {
      success: true,
      data: exercise,
    };
  }

  /**
   * 📋 Get all exercises for lesson
   */
  @Get()
  @ApiOperation({
    summary: 'Get all exercises for lesson',
    description: 'Retrieve all exercises for a specific lesson with pagination',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Exercises retrieved successfully',
  })
  @Public()
  @MessageResponse('Exercises retrieved successfully')
  async getExercises(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.exerciseService.getExercisesByLesson(
      lessonId,
      query,
    );

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * 🔍 Get exercise by ID
   */
  @Get(':exerciseId')
  @ApiOperation({
    summary: 'Get exercise by ID',
    description:
      'Retrieve detailed exercise information with questions and options',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercise retrieved successfully',
    type: ApiResponseDto<ExerciseResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @Public()
  @MessageResponse('Exercise retrieved successfully')
  async getExercise(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    const exercise = await this.exerciseService.getExerciseById(exerciseId);

    return {
      success: true,
      data: exercise,
    };
  }

  /**
   * ✏️ Update exercise
   */
  @Put(':exerciseId')
  @ApiOperation({
    summary: 'Update exercise',
    description: 'Update exercise information and questions',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateExerciseDto })
  @ApiResponse({
    status: 200,
    description: 'Exercise updated successfully',
    type: ApiResponseDto<ExerciseResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid exercise data',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @Public()
  @MessageResponse('Exercise updated successfully')
  async updateExercise(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() updateDto: UpdateExerciseDto,
  ) {
    // Ensure lesson_id consistency
    if (updateDto.lesson_id && updateDto.lesson_id !== lessonId) {
      updateDto.lesson_id = lessonId;
    }

    const exercise = await this.exerciseService.updateExercise(
      exerciseId,
      updateDto,
    );

    return {
      success: true,
      message: 'Exercise updated successfully',
      data: exercise,
    };
  }

  /**
   * 🗑️ Delete exercise
   */
  @Delete(':exerciseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete exercise',
    description: 'Soft delete exercise and all related questions/options',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercise deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @Public()
  @MessageResponse('Exercise deleted successfully')
  async deleteExercise(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    await this.exerciseService.deleteExercise(exerciseId);

    return {
      success: true,
    };
  }

  /**
   * 📊 Get exercise statistics
   */
  @Get(':exerciseId/stats')
  @ApiOperation({
    summary: 'Get exercise statistics',
    description: 'Get comprehensive statistics about the exercise',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercise statistics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @Public()
  @MessageResponse('Exercise statistics retrieved successfully')
  async getExerciseStats(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    const stats = await this.exerciseService.getExerciseStats(exerciseId);

    return {
      success: true,
      data: stats,
    };
  }

  // get all exercise types in the system
  @Get('types/all')
  @ApiOperation({
    summary: 'Get all exercise types',
    description: 'Retrieve a list of all exercise types in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercise types retrieved successfully',
  })
  @Public()
  @MessageResponse('Exercise types retrieved successfully')
  getAllExerciseTypes() {
    const types = this.exerciseService.getAllExerciseTypes();
    return {
      success: true,
      data: types,
    };
  }
}
