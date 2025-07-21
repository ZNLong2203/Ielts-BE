import {
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  MongoQuery,
  createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import * as ISubject from 'src/casl/subject.interface';
import { PrismaService } from '../prisma/prisma.service';
import { Action, Role } from './casl.interface';

type Subjects =
  | InferSubjects<ISubject.SubjectClasses | ISubject.SubjectInstances>
  | typeof ISubject.All;

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private prisma: PrismaService) {}

  createForUser(user: ISubject.User): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility as unknown as AbilityClass<AppAbility>,
    );

    if (!user) {
      // Khách không đăng nhập chỉ có thể xem các nội dung công khai
      can(Action.Read, ISubject.Course, { isPublic: true } as MongoQuery);
      can(Action.Read, ISubject.Blog, { status: 'published' } as MongoQuery);
      can(Action.Read, ISubject.BlogCategory, { isActive: true } as MongoQuery);
      can(Action.Read, ISubject.BlogComment, {
        isApproved: true,
      } as MongoQuery);
      return build();
    }

    switch (user.role) {
      case Role.ADMIN:
        // Admin có thể làm mọi thứ
        can(Action.Manage, ISubject.All);
        break;

      case Role.TEACHER:
        // Profile permissions
        can(Action.Read, ISubject.Profile, { userId: user.id } as MongoQuery);
        can(Action.Update, ISubject.Profile, { userId: user.id } as MongoQuery);

        // Blog permissions for Teacher
        can(Action.Create, ISubject.Blog);
        can(Action.Read, ISubject.Blog, { authorId: user.id } as MongoQuery); // Own blogs
        can(Action.Read, ISubject.Blog, { status: 'published' } as MongoQuery); // Published blogs
        can(Action.Update, ISubject.Blog, { authorId: user.id } as MongoQuery); // Own blogs
        can(Action.Delete, ISubject.Blog, { authorId: user.id } as MongoQuery); // Own blogs

        // Blog Category permissions for Teacher (read only)
        can(Action.Read, ISubject.BlogCategory, {
          isActive: true,
        } as MongoQuery);

        // Blog Comment permissions for Teacher
        can(Action.Create, ISubject.BlogComment);
        can(Action.Read, ISubject.BlogComment);
        can(Action.Update, ISubject.BlogComment, {
          userId: user.id,
        } as MongoQuery); // Own comments
        can(Action.Delete, ISubject.BlogComment, {
          userId: user.id,
        } as MongoQuery); // Own comments
        can(Action.Manage, ISubject.BlogComment); // Teachers can moderate all comments
        break;

      case Role.STUDENT:
        // Profile permissions
        can(Action.Read, ISubject.Profile, { userId: user.id } as MongoQuery);
        can(Action.Update, ISubject.Profile, { userId: user.id } as MongoQuery);

        // Blog permissions for Student (read only published)
        can(Action.Read, ISubject.Blog, { status: 'published' } as MongoQuery);
        can(Action.Read, ISubject.BlogCategory, {
          isActive: true,
        } as MongoQuery);

        // Blog Comment permissions for Student
        can(Action.Create, ISubject.BlogComment);
        can(Action.Read, ISubject.BlogComment, {
          isApproved: true,
        } as MongoQuery); // Only approved comments
        can(Action.Update, ISubject.BlogComment, {
          userId: user.id,
        } as MongoQuery); // Own comments
        can(Action.Delete, ISubject.BlogComment, {
          userId: user.id,
        } as MongoQuery); // Own comments
        break;

      default:
        // Người dùng không có vai trò cụ thể chỉ có thể xem nội dung công khai
        can(Action.Read, ISubject.Course, { isPublic: true } as MongoQuery);
        can(Action.Read, ISubject.Blog, { status: 'published' } as MongoQuery);
        can(Action.Read, ISubject.BlogCategory, {
          isActive: true,
        } as MongoQuery);
        can(Action.Read, ISubject.BlogComment, {
          isApproved: true,
        } as MongoQuery);
        break;
    }

    return build({
      detectSubjectType: (item) =>
        typeof item === 'string'
          ? item
          : (item.constructor as ExtractSubjectType<Subjects>),
    });
  }
}
