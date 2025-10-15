import {
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  MongoQuery,
  createMongoAbility,
} from '@casl/ability';
import { Injectable, Logger } from '@nestjs/common';
import {
  All,
  Blog,
  BlogCategory,
  BlogComment,
  Course,
  Exercise,
  Student,
  Teacher,
  User,
  UserSubmission,
} from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';
import { USER_ROLE } from 'src/common/constants';
import { IUser } from 'src/interface/users.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppAbility, Subjects } from 'src/types/ability.types';

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  constructor(private prisma: PrismaService) {}

  createForUser(user: IUser): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility as unknown as AbilityClass<AppAbility>,
    );

    if (!user) {
      return this.defineGuestAbilities(can, cannot, build);
    }

    switch (user.role) {
      case USER_ROLE.ADMIN:
        this.defineAdminAbilities(can);
        break;

      case USER_ROLE.TEACHER:
        this.defineTeacherAbilities(user, can, cannot);
        break;

      case USER_ROLE.STUDENT:
        this.defineStudentAbilities(user, can, cannot);
        break;

      default:
        this.defineCommonAbilities(user, can);
        break;
    }

    return build({
      detectSubjectType: (item) =>
        typeof item === 'string'
          ? (item as unknown as ExtractSubjectType<Subjects>)
          : (item.constructor as ExtractSubjectType<Subjects>),
    });
  }

  /**
   * Define admin abilities - can do everything
   */
  private defineAdminAbilities(can: AbilityBuilder<AppAbility>['can']): void {
    // Admin có thể làm mọi thứ
    can(Action.Manage, All);
  }

  /**
   * Define teacher abilities
   */
  private defineTeacherAbilities(
    user: IUser,
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
  ): void {
    // Profile permissions
    can(Action.Read, User, { id: user.id } as MongoQuery);
    can(Action.Update, User, { id: user.id } as MongoQuery);
    can(Action.Update, Teacher, { userId: user.id } as MongoQuery);

    // Blog permissions for Teacher
    can(Action.Create, Blog);
    can(Action.Read, Blog, { authorId: user.id } as MongoQuery); // Own blogs
    can(Action.Read, Blog, { status: 'published' } as MongoQuery); // Published blogs
    can(Action.Update, Blog, { authorId: user.id } as MongoQuery); // Own blogs
    can(Action.Delete, Blog, { authorId: user.id } as MongoQuery); // Own blogs

    // Blog Category permissions for Teacher (read only)
    can(Action.Read, BlogCategory, {
      isActive: true,
    } as MongoQuery);

    // Blog Comment permissions for Teacher
    can(Action.Create, BlogComment);
    can(Action.Read, BlogComment);
    can(Action.Update, BlogComment, {
      userId: user.id,
    } as MongoQuery); // Own comments
    can(Action.Delete, BlogComment, {
      userId: user.id,
    } as MongoQuery); // Own comments
    can(Action.Manage, BlogComment); // Teachers can moderate all comments

    // Course permissions for Teacher
    can(Action.Create, Course);
    can(Action.Read, Course, { isPublic: true } as MongoQuery); // Public courses
    can(Action.Read, Course, { teacherId: user.id } as MongoQuery); // Own courses
    can(Action.Update, Course, { teacherId: user.id } as MongoQuery); // Own courses
    can(Action.Delete, Course, { teacherId: user.id } as MongoQuery); // Own courses
    can(Action.Publish, Course, { teacherId: user.id } as MongoQuery); // Own courses

    // Exercise permissions for Teacher
    can(Action.Create, Exercise);
    can(Action.Read, Exercise);
    can(Action.Update, Exercise);
    can(Action.Delete, Exercise);

    // UserSubmission permissions for Teacher
    can(Action.Read, UserSubmission);
    can(Action.Update, UserSubmission); // For grading
  }

  /**
   * Define student abilities
   */
  private defineStudentAbilities(
    user: IUser,
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
  ): void {
    // Profile permissions
    can(Action.Read, User, { id: user.id } as MongoQuery);
    can(Action.Update, User, { id: user.id } as MongoQuery);
    can(Action.Update, Student, { userId: user.id } as MongoQuery);

    // Blog permissions for Student (read only published)
    can(Action.Read, Blog, { status: 'published' } as MongoQuery);
    can(Action.Read, BlogCategory, {
      isActive: true,
    } as MongoQuery);

    // Blog Comment permissions for Student
    can(Action.Create, BlogComment);
    can(Action.Read, BlogComment, {
      isApproved: true,
    } as MongoQuery); // Only approved comments
    can(Action.Update, BlogComment, {
      userId: user.id,
    } as MongoQuery); // Own comments
    can(Action.Delete, BlogComment, {
      userId: user.id,
    } as MongoQuery); // Own comments

    // Course permissions for Student
    can(Action.Read, Course, { isEnrolled: true } as MongoQuery); // Enrolled courses
    can(Action.Read, Course, { isCompleted: true } as MongoQuery); // Completed courses
    can(Action.Read, Course, { isFeatured: true } as MongoQuery); // Featured courses
    can(Action.Read, Course, { isPopular: true } as MongoQuery); // Popular courses
    can(Action.Read, Course, { isNewest: true } as MongoQuery); // Newest courses
    can(Action.Read, Course, { isPublished: true } as MongoQuery); // Published courses

    // Exercise permissions for Student
    can(Action.Read, Exercise);

    // UserSubmission permissions for Student
    can(Action.Create, UserSubmission); // For submitting answers
    can(Action.Read, UserSubmission, { userId: user.id } as MongoQuery); // Own submissions only
  }

  /**
   * Define guest abilities (unauthenticated users)
   */
  private defineGuestAbilities(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    build: AbilityBuilder<AppAbility>['build'],
  ): AppAbility {
    // Guests can only read public content
    can(Action.Read, Course, { isPublic: true } as MongoQuery);
    can(Action.Read, Blog, { status: 'published' } as MongoQuery);
    can(Action.Read, BlogCategory, { isActive: true } as MongoQuery);
    can(Action.Read, BlogComment, {
      isApproved: true,
    } as MongoQuery);
    return build();
  }

  /**
   * Define common abilities for all authenticated users
   */
  private defineCommonAbilities(
    user: IUser,
    can: AbilityBuilder<AppAbility>['can'],
  ): void {
    // Người dùng không có vai trò cụ thể chỉ có thể xem nội dung công khai
    can(Action.Read, Course, { isPublic: true } as MongoQuery);
    can(Action.Read, Blog, { status: 'published' } as MongoQuery);
    can(Action.Read, BlogCategory, {
      isActive: true,
    } as MongoQuery);
    can(Action.Read, BlogComment, {
      isApproved: true,
    } as MongoQuery);
  }
}
