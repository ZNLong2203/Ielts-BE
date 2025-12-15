// src/casl/types/ability.types.ts
import { InferSubjects, MongoAbility } from '@casl/ability';
import { Request } from 'express';
import {
  All,
  Blog,
  BlogCategory,
  BlogComment,
  Cart,
  CartItem,
  Coupon,
  CouponUsage,
  Course,
  CourseCategory,
  Enrollment,
  Exercise,
  ExerciseType,
  LearningPath,
  Lesson,
  LessonNote,
  MockTest,
  Order,
  OrderItem,
  Payment,
  Question,
  QuestionAnswer,
  QuestionOption,
  Student,
  Teacher,
  TestResult,
  User,
  UserLearningPath,
  UserProgress,
  UserSubmission,
} from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';

// Định nghĩa tất cả các subject types có thể được sử dụng

export type SubjectClasses =
  | typeof All
  | typeof User
  | typeof Course
  | typeof CourseCategory
  | typeof Blog
  | typeof BlogCategory
  | typeof BlogComment
  | typeof Student
  | typeof Teacher
  | typeof Coupon
  | typeof CouponUsage
  | typeof Cart
  | typeof CartItem
  | typeof Enrollment
  | typeof Exercise
  | typeof ExerciseType
  | typeof LearningPath
  | typeof LessonNote
  | typeof Lesson
  | typeof MockTest
  | typeof Order
  | typeof OrderItem
  | typeof Payment
  | typeof QuestionAnswer
  | typeof Question
  | typeof QuestionOption
  | typeof TestResult
  | typeof UserLearningPath
  | typeof UserProgress
  | typeof UserSubmission;

export type SubjectInstances =
  | User
  | Course
  | CourseCategory
  | Blog
  | BlogCategory
  | BlogComment
  | Student
  | Teacher
  | Coupon
  | CouponUsage
  | Cart
  | CartItem
  | Enrollment
  | Exercise
  | ExerciseType
  | LearningPath
  | LessonNote
  | Lesson
  | MockTest
  | Order
  | OrderItem
  | Payment
  | QuestionAnswer
  | Question
  | QuestionOption
  | TestResult
  | UserLearningPath
  | UserProgress
  | UserSubmission;

export type Subjects =
  | InferSubjects<SubjectClasses | SubjectInstances>
  | typeof All;

// Định nghĩa kiểu AppAbility với type safety
export type AppAbility = MongoAbility<[Action, Subjects]>;

// Interface cho Policy Handler
export interface PolicyHandlerCallback {
  (ability: AppAbility, request: Request): boolean | Promise<boolean>;
}
