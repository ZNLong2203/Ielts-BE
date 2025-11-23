import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
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
import { CreateQuestionGroupDto } from './dto/create-question-group.dto';
import {
  ReorderQuestionGroupsDto,
  UpdateQuestionGroupDto,
} from './dto/update-question-group.dto';
import { QuestionGroupsService } from './question-groups.service';

@ApiTags('Question Groups')
@ApiBearerAuth()
@Controller('question-groups')
export class QuestionGroupsController {
  constructor(private readonly questionGroupsService: QuestionGroupsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new question group',
    description:
      'Create a new question group in an exercise for organizing related questions',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question group created successfully',
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
  async createQuestionGroup(@Body() createDto: CreateQuestionGroupDto) {
    return this.questionGroupsService.createQuestionGroup(createDto);
  }

  @Get('exercise/:exerciseId')
  @ApiOperation({
    summary: 'Get question groups by exercise',
    description: 'Retrieve all question groups in a specific exercise',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question groups retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Exercise not found',
  })
  @Public()
  async getQuestionGroupsByExercise(@Param('exerciseId') exerciseId: string) {
    return this.questionGroupsService.getQuestionGroupsByExercise(exerciseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get question group details',
    description:
      'Retrieve detailed information of a question group including matching options',
  })
  @ApiParam({
    name: 'id',
    description: 'Question Group ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question group details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question group not found',
  })
  @Public()
  async getQuestionGroupById(@Param('id') id: string) {
    return this.questionGroupsService.getQuestionGroupById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update question group',
    description:
      'Update question group information, instruction, matching options, etc.',
  })
  @ApiParam({
    name: 'id',
    description: 'Question Group ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question group updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question group not found',
  })
  @Public()
  async updateQuestionGroup(
    @Param('id') id: string,
    @Body() updateDto: UpdateQuestionGroupDto,
  ) {
    return this.questionGroupsService.updateQuestionGroup(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete question group',
    description:
      'Soft delete a question group (only if no questions are assigned to it)',
  })
  @ApiParam({
    name: 'id',
    description: 'Question Group ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Question group deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete question group with active questions',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question group not found',
  })
  @Public()
  async deleteQuestionGroup(@Param('id') id: string) {
    return this.questionGroupsService.deleteQuestionGroup(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload question group image',
    description: 'Upload an image for a question group',
  })
  @ApiParam({
    name: 'id',
    description: 'Question Group ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question group not found',
  })
  @Public()
  async uploadQuestionGroupImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg|image/gif|image/webp',
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
    return this.questionGroupsService.uploadQuestionGroupImage(id, file);
  }

  @Put('exercise/:exerciseId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder question groups',
    description:
      'Reorder question groups within an exercise by updating their ordering values',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Question groups reordered successfully',
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
  async reorderQuestionGroups(
    @Param('exerciseId') exerciseId: string,
    @Body() reorderDto: ReorderQuestionGroupsDto,
  ) {
    return this.questionGroupsService.reorderQuestionGroups(
      exerciseId,
      reorderDto.groups,
    );
  }
}
