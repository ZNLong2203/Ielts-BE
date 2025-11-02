// Backend/src/modules/grading/services/band-calculator.service.ts
import { Injectable } from '@nestjs/common';
import {
  LISTENING_BAND_SCORES,
  READING_BAND_SCORES,
} from 'src/modules/grading/constants/grading.constants';
import { SKILL_TYPE, SkillType } from 'src/modules/reading/types/reading.types';

@Injectable()
export class BandCalculatorService {
  /**
   * Calculate IELTS band score based on correct answers
   */
  calculateBandScore(
    correctAnswers: number,
    totalQuestions: number,
    skillType: SkillType,
  ): number {
    // Normalize to 40 questions (IELTS standard)
    const normalized = Math.round((correctAnswers / totalQuestions) * 40);

    let bandTable: { min: number; max: number; band: number }[];

    if (skillType === SKILL_TYPE.READING) {
      bandTable = READING_BAND_SCORES;
    } else if (skillType === SKILL_TYPE.LISTENING) {
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
