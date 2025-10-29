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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { CreateQuestionDto } from './dto/create-question.dto';
import {
  ReorderQuestionsDto,
  UpdateQuestionDto,
} from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new question',
    description:
      'Create a new question in an exercise with options, correct answers, etc.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  @Public()
  async createQuestion(@Body() createDto: CreateQuestionDto) {
    return this.questionsService.createQuestion(createDto);
  }

  @Get('exercise/:exerciseId')
  @ApiOperation({
    summary: 'Get questions by exercise',
    description: 'Retrieve all questions in a specific exercise',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  @Public()
  async getQuestionsByExercise(@Param('exerciseId') exerciseId: string) {
    return this.questionsService.getQuestionsByExercise(exerciseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get question details',
    description:
      'Retrieve detailed information of a question including options and matching options',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Public()
  async getQuestionById(@Param('id') id: string) {
    return this.questionsService.getQuestionById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update question',
    description: 'Update question information, options, correct answers, etc.',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Public()
  async updateQuestion(
    @Param('id') id: string,
    @Body() updateDto: UpdateQuestionDto,
  ) {
    return this.questionsService.updateQuestion(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete question',
    description: 'Soft delete a question and its related options',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Question deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Public()
  async deleteQuestion(@Param('id') id: string) {
    return this.questionsService.deleteQuestion(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload question image',
    description: 'Upload an image for a question',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Public()
  async uploadQuestionImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.questionsService.uploadQuestionImage(id, file);
  }

  @Post(':id/audio')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload question audio',
    description:
      'Upload an audio file for a question (for listening questions)',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audio uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Public()
  async uploadQuestionAudio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.questionsService.uploadQuestionAudio(id, file);
  }

  @Put('exercise/:exerciseId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder questions',
    description:
      'Reorder questions within an exercise by updating their ordering values',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Questions reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or duplicate ordering values',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  @Public()
  async reorderQuestions(
    @Param('exerciseId') exerciseId: string,
    @Body() reorderDto: ReorderQuestionsDto,
  ) {
    return this.questionsService.reorderQuestions(
      exerciseId,
      reorderDto.questions,
    );
  }
}
