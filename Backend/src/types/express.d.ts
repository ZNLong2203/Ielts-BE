import 'express';
import { IUser } from 'src/interface/users.interface';
import { AppAbility } from '../casl/casl-ability.factory';

declare module 'express' {
  export interface Request {
    ability?: AppAbility;
    user?: IUser;
  }
}
