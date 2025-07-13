import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../decorator/customize';

// This is a custom guard that extends the built-in AuthGuard class (like Middleware)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Reflector is a helper class that provides a set of methods for retrieving metadata
  // Simple: help to get metadata from the handler or class
  // Metadata is information about the application that is not part of the application itself
  // For example, decorators are metadata
  constructor(private reflector: Reflector) {
    super();
  }

  // This method is called by Nest when it determines whether the current request is authorized
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // check jwt token by Nest Passport
    return super.canActivate(context);
  }

  // This method is called by Nest when the current request is not authorized
  handleRequest(err, user, info, context: ExecutionContext) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Invalid Token or Unauthorized Access!')
      );
    }

    return user;
  }
}
