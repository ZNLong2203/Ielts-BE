import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { PolicyHandlerCallback } from 'src/types/ability.types';

// Ex: @Public() decorator is used to mark a route as public.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Custom message response
export const MESSAGE_RESPONSE = 'messageResponse';
export const MessageResponse = (message: string) =>
  SetMetadata(MESSAGE_RESPONSE, message);

// Custom decorator for subscriber
export const IS_PUBLIC_PERMISSION = 'isPublicPermission';
export const SkipCheckPermission = () =>
  SetMetadata(IS_PUBLIC_PERMISSION, true);

// Get req.user from the request object.
// ExecutionContext giống không gian thực thi, khi truy cập vào có thể lấy request, response, user, ...
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

// Decorator cho policies (AND logic - phải có tất cả các policies)
export const POLICIES_KEY = 'policies';
export const CheckPolicies = (...handlers: PolicyHandlerCallback[]) =>
  SetMetadata(POLICIES_KEY, handlers);

// Get ability from request
export const GetAbility = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.ability;
  },
);
