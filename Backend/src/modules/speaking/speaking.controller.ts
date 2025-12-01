/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpException,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { SpeakingService } from './speaking.service';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
  TranscribeAndGradeDto,
  TranscribeAndGradeResponse,
  SpeakingQuestion,
  SpeakingPart,
} from './dto/grade-speaking.dto';
import { CreateSpeakingMockTestExerciseDto } from './dto/create-speaking-mock-test.dto';
import { UpdateSpeakingMockTestExerciseDto } from './dto/update-speaking-mock-test.dto';
import { Public, MessageResponse } from 'src/decorator/customize';
import { UploadedFileType } from 'src/interface/file-type.interface';

@ApiTags('speaking')
@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @Post('grade')
  @Public()
  @ApiOperation({ summary: 'Grade speaking from text' })
  async gradeSpeakingByGemini(
    @Body() gradeSpeakingDto: GradeSpeakingDto,
  ): Promise<SpeakingGradeResponse> {
    return this.speakingService.gradeSpeakingByGemini(gradeSpeakingDto);
  }

  @Post('upload-and-transcribe')
  @Public()
  @ApiOperation({ summary: 'Upload audio and transcribe to text' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio file for transcription',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndTranscribe(@UploadedFile() file: UploadedFileType) {
    return await this.speakingService.uploadAndTranscribe(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post('transcribe-and-grade')
  @Public()
  @ApiOperation({ summary: 'Upload audio, transcribe and grade speaking' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio file with grading parameters',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        partType: {
          type: 'string',
          enum: ['part_1', 'part_2', 'part_3'],
        },
        questions: {
          type: 'string',
        },
        additionalInstructions: {
          type: 'string',
        },
        targetDuration: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAndGrade(
    @UploadedFile() file: UploadedFileType,
    @Body()
    body: {
      partType?: string;
      questions?: string | Array<any>;
      additionalInstructions?: string;
      targetDuration?: string;
    },
  ): Promise<TranscribeAndGradeResponse> {
    // Validate file type manually
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/ogg',
      'audio/m4a',
      'audio/webm',
    ];
    const normalizedType = file.mimetype.split(';')[0].trim();

    if (!allowedTypes.includes(normalizedType)) {
      throw new HttpException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let questions: SpeakingQuestion[] = [];
    try {
      const questionsData: any =
        typeof body.questions === 'string'
          ? JSON.parse(body.questions)
          : body.questions || [];
      questions = Array.isArray(questionsData) ? questionsData : [];
    } catch {
      questions = [];
    }

    const dto: TranscribeAndGradeDto = {
      audioBuffer: file.buffer,
      fileName: file.originalname,
      mimetype: file.mimetype,
      partType: (body.partType || 'part_1') as SpeakingPart,
      questions,
      additionalInstructions: body.additionalInstructions,
      targetDuration: body.targetDuration,
    };

    return await this.speakingService.transcribeAndGrade(dto);
  }

  // Mock Test Exercise Endpoints
  @Post('mock-test')
  @ApiOperation({
    summary: 'Create speaking exercise for mock test',
    description: 'Create a new speaking exercise in a mock test section',
  })
  @Public()
  @MessageResponse('Speaking exercise created successfully')
  async createMockTestExercise(
    @Body() createDto: CreateSpeakingMockTestExerciseDto,
  ) {
    return this.speakingService.createExerciseForMockTest(createDto);
  }

  @Get('test-section/:testSectionId')
  @ApiOperation({
    summary: 'Get speaking exercises by test section',
    description: 'Retrieve all speaking exercises in a specific test section',
  })
  @Public()
  @MessageResponse('Speaking exercises retrieved successfully')
  async getSpeakingExercisesByTestSection(
    @Param('testSectionId') testSectionId: string,
  ) {
    return this.speakingService.getExercisesByTestSectionForMockTest(
      testSectionId,
    );
  }

  @Get('mock-test/:id')
  @ApiOperation({
    summary: 'Get speaking exercise by ID (mock test)',
    description: 'Retrieve detailed information of a speaking exercise',
  })
  @Public()
  @MessageResponse('Speaking exercise retrieved successfully')
  async getMockTestExerciseById(@Param('id') id: string) {
    return this.speakingService.getExerciseByIdForMockTest(id);
  }

  @Put('mock-test/:id')
  @ApiOperation({
    summary: 'Update speaking exercise (mock test)',
    description: 'Update speaking exercise information',
  })
  @Public()
  @MessageResponse('Speaking exercise updated successfully')
  async updateMockTestExercise(
    @Param('id') id: string,
    @Body() updateDto: UpdateSpeakingMockTestExerciseDto,
  ) {
    return this.speakingService.updateExerciseForMockTest(id, updateDto);
  }

  @Delete('mock-test/:id')
  @ApiOperation({
    summary: 'Delete speaking exercise (mock test)',
    description: 'Soft delete a speaking exercise',
  })
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @MessageResponse('Speaking exercise deleted successfully')
  async deleteMockTestExercise(@Param('id') id: string) {
    await this.speakingService.deleteExerciseForMockTest(id);
    return { success: true };
  }

  @Get('mock-tests')
  @ApiOperation({
    summary: 'Get all mock tests with speaking sections',
    description:
      'Retrieve all mock tests that contain speaking sections and their exercises',
  })
  @Public()
  @MessageResponse('Mock tests with speaking sections retrieved successfully')
  async getMockTestsWithSpeakingSections() {
    return this.speakingService.getMockTestsWithSections();
  }
}
