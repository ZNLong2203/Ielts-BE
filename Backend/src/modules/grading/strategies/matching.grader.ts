import {
  Grader,
  GradingResult,
  Question,
  UserAnswer,
} from '../types/grading.types';

export class MatchingGrader implements Grader {
  /**
   * Grade matching question
   * userAnswer: string (uuid of selected matching option)
   */
  grade(question: Question, userAnswer: UserAnswer): GradingResult {
    const points = 1;

    // Handle empty answer
    if (!userAnswer) {
      return {
        question_id: question.id,
        is_correct: false,
        user_answer: userAnswer,
        correct_answer: 'See correct matches in options',
        points_earned: 0,
        max_points: points,
      };
    }

    // userAnswer is a string of uuid answer
    const userAnswerUuid = userAnswer as string;

    // Find the correct option for this question
    const correctOptions = question.question_options.filter(
      (opt) => opt.is_correct,
    );
    // For matching questions, there should be exactly one correct option
    // Check if user's answer matches the correct matching_option_id
    const isCorrect = correctOptions.some(
      (opt) => opt.matching_option_id === userAnswerUuid,
    );

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
