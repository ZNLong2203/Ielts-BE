// Backend/src/modules/grading/strategies/true-false.grader.ts
import {
  Grader,
  GradingResult,
  Question,
  UserAnswer,
} from '../types/grading.types';

export class TrueFalseGrader implements Grader {
  /**
   * Grade true/false/not given question
   * Supports: True, False, Not Given (or Yes, No, Not Given)
   */
  grade(question: Question, userAnswer: UserAnswer): GradingResult {
    const correctOption = question.question_options.find(
      (opt) => opt.is_correct,
    );
    const points = question.points || 1;

    // Handle empty answer
    if (!userAnswer) {
      return {
        question_id: question.id,
        is_correct: false,
        user_answer: userAnswer,
        correct_answer: correctOption?.option_text || '',
        points_earned: 0,
        max_points: points,
      };
    }

    // Normalize answers to standard format
    const normalizedUserAnswer = this.normalizeAnswer(userAnswer as string);
    const normalizedCorrect = this.normalizeAnswer(
      correctOption?.option_text || '',
    );

    const isCorrect = normalizedUserAnswer === normalizedCorrect;

    return {
      question_id: question.id,
      is_correct: isCorrect,
      user_answer: userAnswer,
      correct_answer: correctOption?.option_text || '',
      points_earned: isCorrect ? points : 0,
      max_points: points,
    };
  }

  /**
   * Normalize answer to standard format
   * Supports multiple formats:
   * - True/False/Not Given
   * - Yes/No/Not Given
   * - T/F/NG
   * - Y/N/NG
   */
  private normalizeAnswer(value: string | boolean): string {
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    const normalized = value.toString().toLowerCase().trim();

    // Define valid mappings
    const mappings: Record<string, string> = {
      // True
      true: 'TRUE',
      t: 'TRUE',
      yes: 'TRUE',
      y: 'TRUE',

      // False
      false: 'FALSE',
      f: 'FALSE',
      no: 'FALSE',
      n: 'FALSE',

      // Not Given
      'not given': 'NOT_GIVEN',
      not_given: 'NOT_GIVEN',
      notgiven: 'NOT_GIVEN',
      ng: 'NOT_GIVEN',
      'not mentioned': 'NOT_GIVEN',
      unknown: 'NOT_GIVEN',
    };

    return mappings[normalized] || 'INVALID';
  }
}
