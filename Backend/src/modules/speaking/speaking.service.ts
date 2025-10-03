import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
} from './dto/grade-speaking.dto';

@Injectable()
export class SpeakingService {
  constructor(private readonly geminiService: GeminiService) {}
  async gradeSpeakingByGemini(
    gradeSpeakingDto: GradeSpeakingDto,
  ): Promise<SpeakingGradeResponse> {
    return await this.geminiService.gradeSpeaking(gradeSpeakingDto);
  }
}
