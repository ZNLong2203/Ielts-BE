import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import { GradeWritingDto, WritingGradeResponse } from './dto/grade-writing.dto';

@Injectable()
export class WritingService {
  constructor(private readonly geminiService: GeminiService) {}

  async gradeWritingByGemini(
    gradeWritingDto: GradeWritingDto,
  ): Promise<WritingGradeResponse> {
    return await this.geminiService.gradeWriting(gradeWritingDto);
  }
}
