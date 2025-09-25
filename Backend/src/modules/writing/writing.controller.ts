import { Controller, Post, Body } from '@nestjs/common';
import { WritingService } from './writing.service';
import { GradeWritingDto, WritingGradeResponse } from './dto/grade-writing.dto';
import { Public } from 'src/decorator/customize';

@Controller('writing')
export class WritingController {
  constructor(private readonly writingService: WritingService) {}

  @Post('grade')
  @Public()
  async gradeWritingByGemini(
    @Body() gradeWritingDto: GradeWritingDto,
  ): Promise<WritingGradeResponse> {
    return this.writingService.gradeWritingByGemini(gradeWritingDto);
  }
}
