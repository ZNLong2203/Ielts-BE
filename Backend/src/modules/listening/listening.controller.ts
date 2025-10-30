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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessageResponse, Public } from 'src/decorator/customize';
import { CreateListeningExerciseDto } from 'src/modules/listening/dto/create-listening.dto';
import { UpdateListeningExerciseDto } from 'src/modules/listening/dto/update-listening.dto';
import { ListeningService } from 'src/modules/listening/listening.service';

@ApiTags('Listening Exercises + Passages')
@ApiBearerAuth()
@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Post()
  @ApiOperation({
    summary: 'Create listening exercise',
    description:
      'Create a new listening exercise with passage in a mock test section',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Listening exercise created successfully',
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
  async createListeningExercise(@Body() createDto: CreateListeningExerciseDto) {
    return this.listeningService.createExercise(createDto);
  }

  @Get('test-section/:testSectionId')
  @ApiOperation({
    summary: 'Get listening exercises by test section',
    description: 'Retrieve all listening exercises in a specific test section',
  })
  @ApiParam({
    name: 'testSectionId',
    description: 'Test Section ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listening exercises retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test section not found',
  })
  @Public()
  async getListeningExercisesByTestSection(
    @Param('testSectionId') testSectionId: string,
  ) {
    return this.listeningService.getExercisesByTestSection(testSectionId);
  }

  @Get('mock-tests')
  @ApiOperation({
    summary: 'Get all mock tests with listening sections',
    description:
      'Retrieve all mock tests that contain listening sections and their exercises',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock tests with listening sections retrieved successfully',
  })
  @Public()
  async getMockTestsWithListeningSections() {
    return this.listeningService.getMockTestsWithSections();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get listening exercise details',
    description:
      'Retrieve detailed information of a listening exercise including passage, question groups, and questions',
  })
  @ApiParam({
    name: 'id',
    description: 'Listening Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listening exercise details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listening exercise not found',
  })
  @Public()
  async getListeningExerciseById(@Param('id') id: string) {
    return this.listeningService.getExerciseById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update listening exercise',
    description:
      'Update listening exercise information including passage content',
  })
  @ApiParam({
    name: 'id',
    description: 'Listening Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listening exercise updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listening exercise not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Exercise with this title already exists',
  })
  @Public()
  async updateListeningExercise(
    @Param('id') id: string,
    @Body() updateDto: UpdateListeningExerciseDto,
  ) {
    return this.listeningService.updateExercise(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete listening exercise',
    description:
      'Soft delete a listening exercise and all its questions, question groups, and options',
  })
  @ApiParam({
    name: 'id',
    description: 'Listening Exercise ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Listening exercise deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Listening exercise not found',
  })
  @Public()
  async deleteListeningExercise(@Param('id') id: string) {
    return this.listeningService.deleteExercise(id);
  }

  @Post(':exerciseId/audio')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload exercise audio',
    description:
      'Upload an audio file for an exercise. Supports MP3, WAV, AAC, OGG, and MPEG formats. Max file size: 10MB. Audio is converted to HLS format for streaming. Replaces existing audio if any.',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Exercise ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
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
    description: 'Exercise audio uploaded and converted to HLS successfully',
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
    description: 'Exercise not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid file type or file size exceeds limit',
  })
  @Public()
  @MessageResponse('Exercise audio uploaded successfully')
  async uploadExerciseAudio(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
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
    const exercise = await this.listeningService.uploadExerciseAudio(
      exerciseId,
      file,
    );

    return {
      success: true,
      data: exercise,
    };
  }
}
