// src/casl/types/ability.types.ts
import { InferSubjects, MongoAbility } from '@casl/ability';
import { Request } from 'express';
import {
  All,
  Blog,
  BlogCategory,
  BlogComment,
  Course,
  CourseCategory,
  Student,
  Teacher,
  User,
} from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';
import { BlogCommentsService } from 'src/modules/blog-comments/blog-comments.service';
import { BlogsService } from 'src/modules/blogs/blogs.service';
import { StudentsService } from 'src/modules/students/students.service';
import { TeachersService } from 'src/modules/teachers/teachers.service';
import { UsersService } from 'src/modules/users/users.service';

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
  | typeof Teacher;

export type SubjectInstances =
  | User
  | Course
  | CourseCategory
  | Blog
  | BlogCategory
  | BlogComment
  | Student
  | Teacher;

export type Subjects =
  | InferSubjects<SubjectClasses | SubjectInstances>
  | typeof All;

// Định nghĩa kiểu AppAbility với type safety
export type AppAbility = MongoAbility<[Action, Subjects]>;

// Interface cho Policy Handler
export interface PolicyHandlerCallback {
  (ability: AppAbility, request: Request): boolean | Promise<boolean>;
}

// Interface cho Service Context trong request
export interface ServiceContext {
  studentsService?: StudentsService;
  teachersService?: TeachersService;
  usersService?: UsersService;
  blogCommentsService?: BlogCommentsService;
  blogsService?: BlogsService;
  [key: string]: any;
}

export interface ServiceTypeMap {
  studentsService: StudentsService;
  teachersService: TeachersService;
  usersService: UsersService;
  blogCommentsService: BlogCommentsService;
  blogsService: BlogsService;
}
