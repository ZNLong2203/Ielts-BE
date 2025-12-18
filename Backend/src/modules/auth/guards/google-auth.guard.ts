import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err, user, info, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    // User bấm HỦY
    if (req.query?.error === 'access_denied') {
      return null;
    }

    // Lỗi OAuth khác
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
