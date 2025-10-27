/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SpeakingService } from './speaking.service';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
  TranscribeAndGradeDto,
  TranscribeAndGradeResponse,
  SpeakingQuestion,
  SpeakingPart,
} from './dto/grade-speaking.dto';
import { Public } from 'src/decorator/customize';
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
}
