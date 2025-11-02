// Backend/src/modules/grading/strategies/matching.grader.ts
import {
  Grader,
  GradingResult,
  Question,
  UserAnswer,
} from '../types/grading.types';

export class MatchingGrader implements Grader {
  /**
   * Grade matching question
   * UserAnswer format: { "item1": "match1", "item2": "match2" }
   */
  grade(question: Question, userAnswer: UserAnswer): GradingResult {
    const points = question.points || 1;

    // Handle empty answer
    if (
      !userAnswer ||
      typeof userAnswer !== 'object' ||
      Array.isArray(userAnswer)
    ) {
      return {
        question_id: question.id,
        is_correct: false,
        user_answer: userAnswer,
        correct_answer: 'See correct matches in options',
        points_earned: 0,
        max_points: points,
      };
    }

    const userMatches = userAnswer as unknown as Record<string, string>;
    const correctOptions = question.question_options.filter(
      (opt) => opt.is_correct,
    );

    // Count correct matches
    let correctCount = 0;
    const totalRequired = correctOptions.length;

    for (const option of correctOptions) {
      // option_text format: "item1:match1"
      const [item, correctMatch] = option.option_text
        .split(':')
        .map((s) => s.trim().toLowerCase());
      const userMatch = userMatches[item]?.toLowerCase().trim();

      if (userMatch === correctMatch) {
        correctCount++;
      }
    }

    const isCorrect = correctCount === totalRequired;

    return {
      question_id: question.id,
      is_correct: isCorrect,
      user_answer: userAnswer,
      correct_answer: correctOptions.map((opt) => opt.option_text),
      points_earned: isCorrect ? points : 0,
      max_points: points,
    };
  }
}
