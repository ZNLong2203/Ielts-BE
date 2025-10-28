import {
  BadRequestException,
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
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@ApiTags('❓ Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * 📝 Create Question
   */
  @Post()
  @ApiOperation({
    summary: 'Create question for exercise',
    description:
      'Creates a new question with options for reading/listening exercises',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question created successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Question with this ordering already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid question type requirements or exceeds 40 answers limit',
  })
  async createQuestion(
    @Body(new ValidationPipe({ transform: true })) createDto: CreateQuestionDto,
  ) {
    const question = await this.questionsService.createQuestion(createDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Question created successfully',
      data: question,
    };
  }

  /**
   * 📖 Get Questions by Exercise
   */
  @Get('exercise/:exerciseId')
  @ApiOperation({
    summary: 'Get questions by exercise ID',
    description:
      'Retrieves all questions for a specific exercise with options and matching sets',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  async getQuestionsByExercise(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    const result =
      await this.questionsService.getQuestionsByExercise(exerciseId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Questions retrieved successfully',
      data: result,
    };
  }

  /**
   * 🔍 Get Question by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get question by ID',
    description: 'Retrieves detailed information about a specific question',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  async getQuestionById(@Param('id', ParseUUIDPipe) id: string) {
    const question = await this.questionsService.getQuestionById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Question retrieved successfully',
      data: question,
    };
  }

  /**
   * ✏️ Update Question
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update question',
    description: 'Updates question information and options',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Question with this ordering already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid question type requirements or exceeds 40 answers limit',
  })
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) updateDto: UpdateQuestionDto,
  ) {
    const question = await this.questionsService.updateQuestion(id, updateDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Question updated successfully',
      data: question,
    };
  }

  /**
   * 🗑️ Delete Question
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete question',
    description: 'Soft deletes a question and all its options',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only delete reading questions',
  })
  async deleteQuestion(@Param('id', ParseUUIDPipe) id: string) {
    await this.questionsService.deleteQuestion(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Question deleted successfully',
    };
  }

  /**
   * 🖼️ Upload Question Image
   */
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload image for question',
    description:
      'Uploads an image file for a question (replaces existing image if any)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP)',
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or can only upload images for reading questions',
  })
  async uploadQuestionImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const question = await this.questionsService.uploadQuestionImage(id, file);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Question image uploaded successfully',
      data: question,
    };
  }

  /**
   * 🔄 Reorder Questions
   */
  @Put('exercise/:exerciseId/reorder')
  @ApiOperation({
    summary: 'Reorder questions in exercise',
    description:
      'Updates the ordering of multiple questions within an exercise',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        questionOrders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Question UUID',
              },
              ordering: {
                type: 'integer',
                description: 'New ordering position',
                minimum: 1,
              },
            },
            required: ['id', 'ordering'],
          },
          example: [
            { id: 'uuid-1', ordering: 1 },
            { id: 'uuid-2', ordering: 2 },
            { id: 'uuid-3', ordering: 3 },
          ],
        },
      },
      required: ['questionOrders'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Some questions do not belong to this exercise or duplicate ordering values',
  })
  async reorderQuestions(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body(new ValidationPipe({ transform: true }))
    body: {
      questionOrders: Array<{ id: string; ordering: number }>;
    },
  ) {
    if (!body.questionOrders || body.questionOrders.length === 0) {
      throw new BadRequestException(
        'questionOrders array is required and must not be empty',
      );
    }

    // Validate each item in questionOrders
    for (const item of body.questionOrders) {
      if (!item.id || typeof item.ordering !== 'number' || item.ordering < 1) {
        throw new BadRequestException(
          'Each item must have a valid UUID id and ordering number >= 1',
        );
      }
    }

    await this.questionsService.reorderQuestions(
      exerciseId,
      body.questionOrders,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Successfully reordered ${body.questionOrders.length} questions`,
      data: {
        exercise_id: exerciseId,
        total_reordered: body.questionOrders.length,
      },
    };
  }

  /**
   * 📊 Get Question Statistics by Exercise
   */
  @Get('exercise/:exerciseId/statistics')
  @ApiOperation({
    summary: 'Get question statistics for exercise',
    description:
      'Retrieves statistics about questions in an exercise (types, difficulty, etc.)',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getQuestionStatistics(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    const result =
      await this.questionsService.getQuestionsByExercise(exerciseId);

    // Calculate statistics
    const questionTypes = result.questions.reduce(
      (acc, q) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalCorrectAnswers = result.questions.reduce(
      (sum, q) => sum + q.correct_answer_count,
      0,
    );

    const averageDifficulty =
      result.questions.filter((q) => q.difficulty_level).length > 0
        ? result.questions.reduce(
            (sum, q) => sum + (q.difficulty_level || 0),
            0,
          ) / result.questions.filter((q) => q.difficulty_level).length
        : 0;

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Question statistics retrieved successfully',
      data: {
        exercise_id: exerciseId,
        exercise_title: result.exercise_info.title,
        total_questions: result.total_questions,
        total_correct_answers: totalCorrectAnswers,
        average_difficulty: Number(averageDifficulty.toFixed(1)),
        question_types: questionTypes,
        questions_by_difficulty: result.questions
          .filter((q) => q.difficulty_level)
          .reduce(
            (acc, q) => {
              const level = q.difficulty_level!.toString();
              acc[level] = (acc[level] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
      },
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
    const exercise = await this.questionsService.uploadQuestionImage(
      questionId,
      file,
    );

    return {
      success: true,
      data: exercise,
    };
  }
}
