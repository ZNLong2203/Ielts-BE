import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CaslAbilityFactory } from 'src/casl/casl-ability.factory';
import {
  IS_PUBLIC_KEY,
  IS_PUBLIC_PERMISSION,
  POLICIES_KEY,
} from 'src/decorator/customize';
import { PolicyHandlerCallback } from 'src/types/ability.types';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  /**
   * Validates if the current request can be activated based on user permissions
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra xem endpoint có được đánh dấu là public không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Kiểm tra xem có nên bỏ qua kiểm tra quyền không
    const skipPermission = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_PERMISSION,
      [context.getHandler(), context.getClass()],
    );

    if (skipPermission) {
      return true;
    }

    // Lấy các policy handlers được định nghĩa cho route này
    const policyHandlers = this.reflector.getAllAndOverride<
      PolicyHandlerCallback[]
    >(POLICIES_KEY, [context.getHandler(), context.getClass()]);

    // Nếu không có policies được định nghĩa, hạn chế truy cập theo mặc định
    if (!policyHandlers || policyHandlers.length === 0) {
      this.logger.warn(
        `No permission policies defined for route: ${context.getHandler().name}`,
      );
      throw new ForbiddenException(
        'No permission policies defined for this route',
      );
    }

    // Lấy request và user
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    try {
      // Tạo ability cho user
      const ability = this.caslAbilityFactory.createForUser(user);

      // Đính kèm ability vào request
      request.ability = ability;

      // Thực thi tất cả các policy handlers
      for (const handler of policyHandlers) {
        try {
          const result = await Promise.resolve(handler(ability, request));
          if (!result) {
            this.logger.warn(
              `Permission denied for user ${user.id} on ${request.method} ${request.path}`,
            );
            throw new ForbiddenException(
              'You do not have permission for this operation',
            );
          }
        } catch (error) {
          const e = error as Error;
          // Truyền qua NotFoundException
          if (e instanceof NotFoundException) {
            throw e;
          }

          // Chuyển đổi các lỗi khác thành ForbiddenException
          this.logger.error(`Policy error: ${e.message}`);
          throw new ForbiddenException(e.message || 'Permission denied');
        }
      }

      return true;
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        `Permission error for user ${user?.id} on ${request.method} ${request.path}: ${e.message}`,
        e.stack,
      );
      throw e;
    }
  }
}
