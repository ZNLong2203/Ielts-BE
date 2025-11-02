// Backend/src/modules/grading/strategies/multiple-choice.grader.ts
import {
  Grader,
  GradingResult,
  Question,
  UserAnswer,
} from '../types/grading.types';

export class MultipleChoiceGrader implements Grader {
  /**
   * Grade multiple choice question
   * Supports single answer (string) or multiple answers (string[])
   */
  grade(question: Question, userAnswer: UserAnswer): GradingResult {
    const correctOptions = question.question_options.filter(
      (opt) => opt.is_correct,
    );
    const points = question.points || 1;

    // Handle empty answer
    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
      return {
        question_id: question.id,
        is_correct: false,
        user_answer: userAnswer,
        correct_answer: correctOptions.map((opt) => opt.option_text),
        points_earned: 0,
        max_points: points,
      };
    }

    // Normalize user answer to array
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];

    // Normalize to lowercase for comparison
    const normalizedUserAnswers = userAnswers.map((ans: string) =>
      ans.toLowerCase().trim(),
    );

    const correctIds = correctOptions.map((opt) => opt.id.toLowerCase());
    const correctTexts = correctOptions.map((opt) =>
      opt.option_text.toLowerCase(),
    );

    // Check if all user answers are correct and no incorrect selections
    const correctSelections = normalizedUserAnswers.filter(
      (ans) => correctIds.includes(ans) || correctTexts.includes(ans),
    );

    const isCorrect =
      correctSelections.length === correctOptions.length &&
      normalizedUserAnswers.length === correctOptions.length;

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
