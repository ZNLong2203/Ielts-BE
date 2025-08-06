// src/types/express.d.ts
import 'express';
import { IUser } from 'src/interface/users.interface';
import { ServiceContext } from 'src/types/ability.types';
import { AppAbility } from '../casl/casl-ability.factory'; // Đường dẫn tùy dự án bạn

declare module 'express' {
  export interface Request {
    ability?: AppAbility;
    user?: IUser;
    serviceContext: ServiceContext;
    rawBody?: Buffer;
  }
}
