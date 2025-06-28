import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from 'src/casl/subject.interface';
import {
  IS_PUBLIC_KEY,
  IS_PUBLIC_PERMISSION,
  POLICIES_KEY,
  PolicyHandler,
} from '../../decorator/customize';
import { CaslAbilityFactory } from '../casl-ability.factory';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra nếu endpoint được đánh dấu là public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Kiểm tra nếu endpoint được đánh dấu là bỏ qua kiểm tra quyền
    const skipPermission = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_PERMISSION,
      [context.getHandler(), context.getClass()],
    );

    if (skipPermission) {
      return true;
    }

    // Kiểm tra policies
    const policyHandlers = this.reflector.getAllAndOverride<PolicyHandler[]>(
      POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có permissions hoặc policies nào được định nghĩa
    if (!policyHandlers || policyHandlers.length === 0) {
      // return true;
      throw new ForbiddenException(
        'No permission policies defined for this route',
      );
    }

    // Lấy thông tin user từ request
    const request = context.switchToHttp().getRequest<Request>();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('You need to login to access this resource');
    }

    // Tạo ability dựa trên user
    const ability = await this.caslAbilityFactory.createForUser(user);

    // Kiểm tra policies nếu có
    const hasPolicies = policyHandlers.every((handler) =>
      handler(ability, request),
    );

    if (!hasPolicies) {
      throw new ForbiddenException(
        `You do not have permission based on the policies`,
      );
    }

    // Gắn ability vào request để có thể sử dụng trong controller/service
    request.ability = ability;

    return true;
  }
}
