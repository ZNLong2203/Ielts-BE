import { Controller } from '@nestjs/common';
import { GradingService } from './grading.service';

@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}
}
