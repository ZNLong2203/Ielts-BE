// src/modules/lessons/controllers/exercise.controller.ts
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
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessageResponse, Public } from 'src/decorator/customize';
import {
  CreateExerciseDto,
  CreateQuestionDto,
} from 'src/modules/exercises/dto/create-exercise.dto';
import {
  ExerciseResponseDto,
  UpdateExerciseDto,
} from 'src/modules/exercises/dto/update-exercise.dto';
import { ExerciseService } from 'src/modules/exercises/exercises.service';
import { ApiResponseDto } from 'src/modules/sections/dto/section-response.dto';

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
    const exercise = await this.exerciseService.createExercise(
      createDto,
      lessonId,
    );

    return {
      success: true,
      data: exercise,
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

  // upload question image
  @Post(':exerciseId/question/:questionId/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload question image',
    description: 'Upload an image for the question',
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
  @ApiParam({
    name: 'questionId',
    description: 'Question ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Question image uploaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
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
    const exercise = await this.exerciseService.uploadQuestionImage(
      questionId,
      file,
    );

    return {
      success: true,
      data: exercise,
    };
  }

  // upload question audio max 10min
  @Post(':exerciseId/question/:questionId/audio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload question audio',
    description: 'Upload an audio file for the question',
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
  @ApiParam({
    name: 'questionId',
    description: 'Question ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Question audio uploaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @Public()
  @MessageResponse('Question audio uploaded successfully')
  async uploadExerciseAudio(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'audio/mpeg|audio/wav|audio/ogg|audio/mp3',
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    const exercise = await this.exerciseService.uploadQuestionAudio(
      questionId,
      file,
    );

    return {
      success: true,
      data: exercise,
    };
  }

  /**
   * Create question for exercise
   */
  @Post(':exerciseId/question')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create question for exercise',
    description: 'Create a new question for the specified exercise',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @Public()
  @MessageResponse('Question created successfully')
  async createQuestion(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    const question = await this.exerciseService.createQuestion(
      exerciseId,
      createQuestionDto,
    );

    return {
      success: true,
      data: question,
    };
  }

  /**
   * Update question for exercise
   */
  @Put(':exerciseId/question/:questionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update question for exercise',
    description: 'Update an existing question for the specified exercise',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'questionId',
    description: 'Question ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @Public()
  @MessageResponse('Question updated successfully')
  async updateQuestion(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() updateQuestionDto: CreateQuestionDto,
  ) {
    const question = await this.exerciseService.updateQuestion(
      questionId,
      updateQuestionDto,
    );

    return {
      success: true,
      data: question,
    };
  }

  /**
   * Delete question for exercise
   */
  @Delete(':exerciseId/question/:questionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete question for exercise',
    description: 'Delete an existing question for the specified exercise',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'questionId',
    description: 'Question ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Question deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @Public()
  @MessageResponse('Question deleted successfully')
  async deleteQuestion(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    await this.exerciseService.deleteQuestion(questionId);

    return {
      success: true,
    };
  }
}
