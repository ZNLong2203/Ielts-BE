import {
  Grader,
  GradingResult,
  Question,
  UserAnswer,
} from '../types/grading.types';

export class MultipleChoiceGrader implements Grader {
  /**
   * Grade multiple choice question
   * userAnswer: string[] (array of uuids of selected options)
   */
  grade(question: Question, userAnswer: UserAnswer): GradingResult {
    const correctOptions = question.question_options.filter(
      (opt) => opt.is_correct,
    );

    // calculate points by total points of question_options that are correct
    const points = correctOptions.reduce((sum, opt) => sum + opt.point, 0);

    if (!Array.isArray(userAnswer)) {
      throw new Error(
        'Invalid user answer format for multiple choice question, expected an array of strings.',
      );
    }

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

    // userAnswer is an array of uuids
    const userAnswersArray = userAnswer as unknown as string[];

    // Check if all correct options are selected and no incorrect options are selected
    const correctOptionIds = correctOptions.map((opt) => opt.id);
    const isCorrect =
      userAnswersArray.length === correctOptionIds.length &&
      userAnswersArray.every((ans) => correctOptionIds.includes(ans));

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
