import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { PolicyHandlerCallback } from 'src/types/ability.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Tùy chỉnh message response
export const MESSAGE_RESPONSE = 'messageResponse';
export const MessageResponse = (message: string) =>
  SetMetadata(MESSAGE_RESPONSE, message);

// Decorator tùy chỉnh cho subscriber
export const IS_PUBLIC_PERMISSION = 'isPublicPermission';
export const SkipCheckPermission = () =>
  SetMetadata(IS_PUBLIC_PERMISSION, true);

// Lấy req.user từ đối tượng request.
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

// Decorator cho policies
export const POLICIES_KEY = 'policies';
export const CheckPolicies = (...handlers: PolicyHandlerCallback[]) =>
  SetMetadata(POLICIES_KEY, handlers);

// Lấy ability từ request
export const GetAbility = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.ability;
  },
);
