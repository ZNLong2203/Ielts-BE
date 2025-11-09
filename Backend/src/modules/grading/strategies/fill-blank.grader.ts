// Backend/src/modules/grading/strategies/fill-blank.grader.ts
import {
  Grader,
  GradingResult,
  Question,
  UserAnswer,
} from '../types/grading.types';

export class FillBlankGrader implements Grader {
  /**
   * Grade fill in the blank question
   * Accepts variations and ignores case/punctuation
   */
  grade(question: Question, userAnswer: UserAnswer): GradingResult {
    const correctOptions = question.question_options.filter(
      (opt) => opt.is_correct,
    );
    const points = 1;

    // Handle empty answer
    if (
      !userAnswer ||
      (typeof userAnswer === 'string' && userAnswer.trim() === '')
    ) {
      return {
        question_id: question.id,
        is_correct: false,
        user_answer: userAnswer,
        correct_answer: correctOptions.map((opt) => opt.option_text),
        points_earned: 0,
        max_points: points,
      };
    }

    // Normalize user answer
    const normalizedUserAnswer = this.normalizeText(userAnswer as string);

    // Check against all acceptable answers
    const isCorrect = correctOptions.some((opt) => {
      const normalizedCorrect = this.normalizeText(opt.option_text);
      return normalizedUserAnswer === normalizedCorrect;
    });

    return {
      question_id: question.id,
      is_correct: isCorrect,
      user_answer: userAnswer,
      correct_answer: correctOptions.map((opt) => opt.option_text),
      points_earned: isCorrect ? points : 0,
      max_points: points,
    };
  }

  /**
   * Normalize text: lowercase, remove punctuation, trim spaces
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:'"-]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }
}
