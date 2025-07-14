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

  async createForUser(user: ISubject.User): Promise<AppAbility> {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility as unknown as AbilityClass<AppAbility>,
    );

    if (!user) {
      // Khách không đăng nhập chỉ có thể xem các khóa học công khai
      can(Action.Read, ISubject.Course, { isPublic: true } as MongoQuery);
      return build();
    }

    switch (user.role) {
      case Role.ADMIN:
        // Admin có thể làm mọi thứ
        can(Action.Manage, ISubject.All);
        break;

      case Role.TEACHER:
        can(Action.Read, ISubject.Profile, { userId: user.id } as MongoQuery);
        can(Action.Update, ISubject.Profile, { userId: user.id } as MongoQuery);
        break;

      case Role.STUDENT:
        can(Action.Read, ISubject.Profile, { userId: user.id } as MongoQuery);
        can(Action.Update, ISubject.Profile, { userId: user.id } as MongoQuery);
        break;

      default:
        // Người dùng không có vai trò cụ thể chỉ có thể xem các khóa học công khai
        can(Action.Read, ISubject.Course, { isPublic: true } as MongoQuery);
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
