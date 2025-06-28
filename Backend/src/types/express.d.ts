// src/types/express.d.ts
import 'express';
import { AppAbility } from '../casl/casl-ability.factory'; // Đường dẫn tùy dự án bạn

declare module 'express' {
  export interface Request {
    ability?: AppAbility;
    user?: any;
  }
}
