import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
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
import {
  CurrentUser,
  MessageResponse,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';
import {
  CreateExerciseDto,
  CreateQuestionDto,
} from 'src/modules/exercises/dto/create-exercise.dto';
import {
  ExerciseResponseDto,
  UpdateExerciseDto,
} from 'src/modules/exercises/dto/update-exercise.dto';
import {
  SubmitExerciseDto,
  ExerciseSubmissionResponseDto,
} from 'src/modules/exercises/dto/submit-exercise.dto';
import { ExerciseService } from 'src/modules/exercises/exercises.service';
import { ApiResponseDto } from 'src/modules/sections/dto/section-response.dto';
import { IUser } from 'src/interface/users.interface';

@ApiTags('Lesson Exercises')
@Controller('lessons/:lessonId/exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  /**
   * Create exercise (without questions)
   * Questions should be added separately using POST /:exerciseId/question
   */
  @Post()
  @ApiOperation({
    summary: 'Create exercise for lesson',
    description:
      'Create a new exercise for a specific lesson. This only creates the exercise metadata. Questions should be added separately using the question endpoints.',
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
    description: 'Exercise created successfully (without questions)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lesson_id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'IELTS Reading Exercise' },
            instruction: {
              type: 'string',
              nullable: true,
              example: 'Read the passage carefully and answer all questions',
            },
            content: { type: 'object', nullable: true },
            time_limit: { type: 'number', example: 30 },
            max_attempts: { type: 'number', example: 3 },
            passing_score: { type: 'number', example: 70 },
            ordering: { type: 'number', example: 0 },
            is_active: { type: 'boolean', example: true },
            deleted: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
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
   * Get all exercises by lesson ID
   */
  @Get()
  @ApiOperation({
    summary: 'Get all exercises for a lesson',
    description: 'Retrieve all exercises associated with a specific lesson.',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercises retrieved successfully',
    type: ApiResponseDto<ExerciseResponseDto[]>,
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @Public()
  @MessageResponse('Exercises retrieved successfully')
  async getExercises(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    const exercises =
      await this.exerciseService.getExercisesByLessonId(lessonId);

    return {
      success: true,
      data: exercises,
    };
  }

  /**
   * Submit exercise answers
   */
  @Post(':exerciseId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit exercise answers',
    description:
      'Submit answers for an exercise, grade them, and save the results. Returns the submission with scores and question results.',
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
  @ApiBody({ type: SubmitExerciseDto })
  @ApiResponse({
    status: 200,
    description: 'Exercise submitted and graded successfully',
    type: ApiResponseDto<ExerciseSubmissionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or maximum attempts exceeded',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @SkipCheckPermission()
  @MessageResponse('Exercise submitted successfully')
  async submitExercise(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() submitDto: SubmitExerciseDto,
    @CurrentUser() user: IUser,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User ID is required');
    }

    const result = await this.exerciseService.submitExercise(
      exerciseId,
      user.id,
      submitDto.answers,
      submitDto.timeTaken,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get user's submission for an exercise
   */
  @Get(':exerciseId/submission')
  @ApiOperation({
    summary: 'Get user submission for exercise',
    description:
      "Retrieve the user's most recent submission for an exercise, including scores and question results.",
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
    description: 'Submission retrieved successfully',
    type: ApiResponseDto<ExerciseSubmissionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise or submission not found',
  })
  @SkipCheckPermission()
  @MessageResponse('Submission retrieved successfully')
  async getExerciseSubmission(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @CurrentUser() user: IUser,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User ID is required');
    }

    const submission = await this.exerciseService.getExerciseSubmission(
      exerciseId,
      user.id,
    );

    if (!submission) {
      throw new NotFoundException('No submission found for this exercise');
    }

    return {
      success: true,
      data: submission,
    };
  }

  /**
   * Get exercise by ID (includes questions)
   */
  @Get(':exerciseId')
  @ApiOperation({
    summary: 'Get exercise by ID',
    description:
      'Retrieve detailed exercise information including all questions and options. Audio URLs are automatically converted to HLS streaming URLs.',
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
   * Update exercise metadata
   */
  @Put(':exerciseId')
  @ApiOperation({
    summary: 'Update exercise',
    description:
      'Update exercise metadata (title, instruction, time_limit, etc.). To modify questions, use the question endpoints.',
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
   * Delete exercise
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
   * Get exercise statistics
   */
  @Get(':exerciseId/stats')
  @ApiOperation({
    summary: 'Get exercise statistics',
    description:
      'Get comprehensive statistics about the exercise including question types, difficulty distribution, and scoring information',
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
  @ApiResponse({
    status: 200,
    description: 'Exercise statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'IELTS Reading Practice' },
            total_questions: { type: 'number', example: 40 },
            total_points: { type: 'number', example: 40 },
            question_types: {
              type: 'object',
              example: {
                multiple_choice: 20,
                fill_blank: 10,
                true_false: 10,
              },
            },
            time_limit: { type: 'number', example: 60, nullable: true },
            passing_score: { type: 'number', example: 70, nullable: true },
            is_active: { type: 'boolean', example: true },
          },
        },
      },
    },
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

  /**
   * Get all question types available in the system
   * NOTE: This route MUST be before /:exerciseId to avoid route conflicts
   */
  @Get('types/all')
  @ApiOperation({
    summary: 'Get all question types',
    description:
      'Retrieve a list of all available question types in the system (multiple_choice, essay, speaking, true_false, fill_blank, matching, summary_completion, droplist)',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'Lesson ID (required in URL path)',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Question types retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'multiple_choice',
            'essay',
            'speaking',
            'true_false',
            'fill_blank',
            'matching',
            'summary_completion',
            'droplist',
          ],
        },
      },
    },
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
    const exercise = await this.exerciseService.uploadQuestionImage(
      questionId,
      file,
    );

    return {
      success: true,
      data: exercise,
    };
  }

  /**
   * Upload audio for question
   */
  @Post(':exerciseId/question/:questionId/audio')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload question audio',
    description:
      'Upload an audio file for a question. Supports MP3, WAV, AAC, OGG, and MPEG formats. Max file size: 10MB. Audio is converted to HLS format for streaming. Replaces existing audio if any.',
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
    description: 'Question ID to upload audio for',
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
          description: 'Audio file (MP3, WAV, AAC, OGG, MPEG - Max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question audio uploaded and converted to HLS successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            audio_url: {
              type: 'string',
              example: 'exercises/audio/filename.m3u8',
              description: 'HLS playlist path for streaming',
            },
            audio_duration: {
              type: 'number',
              example: 120,
              description: 'Audio duration in seconds',
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
    description:
      'Create a new question for the specified exercise. Questions are created separately from exercises. Use media_url to upload image or audio, which will be automatically split into image_url or audio_url based on file type.',
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
    description: 'Exercise ID to add question to',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiBody({
    type: CreateQuestionDto,
    description:
      'Question data including text, options, correct answer, and optional media',
    examples: {
      'Multiple Choice': {
        value: {
          question_text: 'What is the capital of France?',
          question_type: 'multiple_choice',
          options: ['London', 'Paris', 'Berlin', 'Madrid'],
          correct_answer: 'Paris',
          points: 1,
          order_index: 1,
        },
      },
      'With Image': {
        value: {
          question_text: 'Identify the object in the image',
          question_type: 'multiple_choice',
          media_url: 'https://example.com/image.jpg',
          options: ['Cat', 'Dog', 'Bird', 'Fish'],
          correct_answer: 'Cat',
          points: 1,
          order_index: 2,
        },
      },
      'With Audio': {
        value: {
          question_text: 'What did the speaker say?',
          question_type: 'listening',
          media_url: 'https://example.com/audio.mp3',
          options: ['Yes', 'No', 'Maybe'],
          correct_answer: 'Yes',
          points: 1,
          order_index: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            exercise_id: { type: 'string', format: 'uuid' },
            question_text: { type: 'string' },
            question_type: { type: 'string' },
            image_url: { type: 'string', nullable: true },
            audio_url: { type: 'string', nullable: true },
            audio_duration: { type: 'number', nullable: true },
            reading_passage: { type: 'string', nullable: true },
            question_group: { type: 'string', nullable: true },
            options: { type: 'array', items: { type: 'string' } },
            correct_answer: { type: 'string' },
            points: { type: 'number' },
            order_index: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise not found',
  })
  @Public()
  @MessageResponse('Question created successfully')
  async createQuestion(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
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
    description:
      'Update an existing question for the specified exercise. Use media_url to update image or audio, which will be automatically split into image_url or audio_url based on file type.',
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
    description: 'Question ID to update',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiBody({
    type: CreateQuestionDto,
    description: 'Partial question data to update',
    examples: {
      'Update Text': {
        value: {
          question_text: 'Updated question text',
          points: 2,
        },
      },
      'Update with Image': {
        value: {
          question_text: 'What is shown in this image?',
          media_url: 'https://example.com/new-image.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            exercise_id: { type: 'string', format: 'uuid' },
            question_text: { type: 'string' },
            question_type: { type: 'string' },
            image_url: { type: 'string', nullable: true },
            audio_url: { type: 'string', nullable: true },
            audio_duration: { type: 'number', nullable: true },
            reading_passage: { type: 'string', nullable: true },
            question_group: { type: 'string', nullable: true },
            options: { type: 'array', items: { type: 'string' } },
            correct_answer: { type: 'string' },
            points: { type: 'number' },
            order_index: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
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
  @Public()
  @MessageResponse('Question updated successfully')
  async updateQuestion(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
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
    description:
      'Delete an existing question for the specified exercise. This will permanently remove the question and all its associated data including media files.',
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
    description: 'Question ID to delete',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Question deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @Public()
  @MessageResponse('Question deleted successfully')
  async deleteQuestion(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    await this.exerciseService.deleteQuestion(questionId);

    return {
      success: true,
    };
  }
}
