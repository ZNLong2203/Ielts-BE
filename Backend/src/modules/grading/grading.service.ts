// Backend/src/modules/grading/services/grading.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { QUESTION_TYPE } from 'src/modules/exercises/constants';
import { BandCalculatorService } from 'src/modules/grading/band-calculator.service';
import { FillBlankGrader } from 'src/modules/grading/strategies/fill-blank.grader';
import { MatchingGrader } from 'src/modules/grading/strategies/matching.grader';
import { MultipleChoiceGrader } from 'src/modules/grading/strategies/multiple-choice.grader';
import { TrueFalseGrader } from 'src/modules/grading/strategies/true-false.grader';
import {
  Grader,
  GradeTestParams,
  GradingResult,
  Question,
  SectionResult,
  TestResult,
  UserAnswer,
} from 'src/modules/grading/types/grading.types';
import { SectionType } from 'src/modules/mock-tests/constants';

@Injectable()
export class GradingService {
  private graders: Map<string, Grader>;

  constructor(private readonly bandCalculator: BandCalculatorService) {
    this.graders = new Map([
      [QUESTION_TYPE.MULTIPLE_CHOICE, new MultipleChoiceGrader()],
      [QUESTION_TYPE.FILL_BLANK, new FillBlankGrader()],
      [QUESTION_TYPE.TRUE_FALSE, new TrueFalseGrader()],
      [QUESTION_TYPE.MATCHING, new MatchingGrader()],
    ]);
  }

  /**
   * Grade a single question
   */
  gradeQuestion(question: Question, userAnswer: UserAnswer): GradingResult {
    const grader = this.graders.get(question.question_type);

    if (!grader) {
      throw new BadRequestException(
        `No grader found for question type: ${question.question_type}`,
      );
    }

    return grader.grade(question, userAnswer);
  }

  /**
   * Grade a section (multiple questions)
   */
  gradeSection(
    questions: Question[],
    userAnswers: Record<string, UserAnswer>,
    skillType: SectionType,
  ): SectionResult {
    const results: GradingResult[] = [];
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
      const userAnswer = userAnswers[question.id];
      const result = this.gradeQuestion(question, userAnswer);

      results.push(result);
      totalPoints += result.max_points;
      earnedPoints += result.points_earned;

      if (result.is_correct) {
        correctCount++;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const bandScore = this.bandCalculator.calculateBandScore(
      correctCount,
      questions.length,
      skillType,
    );

    return {
      correct_count: correctCount,
      total_count: questions.length,
      score: Math.round(score * 100) / 100,
      band_score: bandScore,
      results,
    };
  }

  /**
   * Grade entire test (reading + listening)
   */
  gradeTest(params: GradeTestParams): TestResult {
    const {
      readingQuestions,
      readingAnswers,
      listeningQuestions,
      listeningAnswers,
    } = params;

    const result: TestResult = {
      overall_correct: 0,
      overall_total: 0,
      overall_band: 0,
    };

    // Grade reading section
    if (readingQuestions && readingQuestions.length > 0) {
      result.reading_result = this.gradeSection(
        readingQuestions,
        readingAnswers,
        'reading',
      );
      result.overall_correct += result.reading_result.correct_count;
      result.overall_total += result.reading_result.total_count;
    }

    // Grade listening section
    if (listeningQuestions && listeningQuestions.length > 0) {
      result.listening_result = this.gradeSection(
        listeningQuestions,
        listeningAnswers,
        'listening',
      );
      result.overall_correct += result.listening_result.correct_count;
      result.overall_total += result.listening_result.total_count;
    }

    // Calculate overall band score
    const readingBand = result.reading_result?.band_score || 0;
    const listeningBand = result.listening_result?.band_score || 0;
    const bandsCount =
      (result.reading_result ? 1 : 0) + (result.listening_result ? 1 : 0);

    if (bandsCount > 0) {
      const averageBand = (readingBand + listeningBand) / bandsCount;
      result.overall_band = Math.round(averageBand * 2) / 2; // Round to nearest 0.5
    }

    return result;
  }

  /**
   * Calculate overall test score and band (for all 4 skills)
   * @param readingScore: number
   * @param listeningScore: number
   * @param writingScore: number
   * @param speakingScore: number
   * @returns overall_score: number
   */
  calculateOverallTestScore(
    readingScore: number | null,
    listeningScore: number | null,
    writingScore: number | null,
    speakingScore: number | null,
  ): number {
    let total = 0;
    let count = 0;

    if (readingScore !== null) {
      total += readingScore;
      count++;
    }
    if (listeningScore !== null) {
      total += listeningScore;
      count++;
    }
    if (writingScore !== null) {
      total += writingScore;
      count++;
    }
    if (speakingScore !== null) {
      total += speakingScore;
      count++;
    }

    if (count === 0) {
      return 0;
    }

    const overall = total / count;
    return Math.round(overall * 2) / 2; // Round to nearest 0.5
  }
}
