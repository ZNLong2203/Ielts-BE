import { Controller, Post, Body } from '@nestjs/common';
import { SpeakingService } from './speaking.service';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
} from './dto/grade-speaking.dto';
import { Public } from 'src/decorator/customize';

@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @Post('grade')
  @Public()
  async gradeSpeakingByGemini(
    @Body() gradeSpeakingDto: GradeSpeakingDto,
  ): Promise<SpeakingGradeResponse> {
    return this.speakingService.gradeSpeakingByGemini(gradeSpeakingDto);
  }
}
