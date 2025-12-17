import { Injectable } from '@nestjs/common';
import {
  LISTENING_BAND_SCORES,
  READING_BAND_SCORES,
} from 'src/modules/grading/constants/grading.constants';
import { SECTION_TYPE, SectionType } from 'src/modules/mock-tests/constants';

@Injectable()
export class BandCalculatorService {
  /**
   * Calculate IELTS band score based on correct answers
   */
  calculateBandScore(
    correctAnswers: number,
    totalQuestions: number,
    skillType: SectionType,
  ): number {
    // Chuẩn hóa về 40 câu hỏi (chuẩn IELTS)
    const normalized = Math.round((correctAnswers / totalQuestions) * 40);

    let bandTable: { min: number; max: number; band: number }[];

    if (skillType === SECTION_TYPE.READING) {
      bandTable = READING_BAND_SCORES;
    } else if (skillType === SECTION_TYPE.LISTENING) {
      bandTable = LISTENING_BAND_SCORES;
    } else {
      throw new Error(`Unsupported skill type: ${skillType}`);
    }

    for (const range of bandTable) {
      if (normalized >= range.min && normalized <= range.max) {
        return range.band;
      }
    }

    return 0;
  }
}
