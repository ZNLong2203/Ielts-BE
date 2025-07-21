// src/casl/guards/permission.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CaslAbilityFactory } from 'src/casl/casl-ability.factory';
import {
  IS_PUBLIC_KEY,
  IS_PUBLIC_PERMISSION,
  POLICIES_KEY,
} from 'src/decorator/customize';
import { PolicyHandlerCallback, ServiceContext } from 'src/types/ability.types';
import { StudentsService } from '../../modules/students/students.service';
import { TeachersService } from '../../modules/teachers/teachers.service';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Validates if the current request can be activated based on user permissions
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if permission check should be skipped
    const skipPermission = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_PERMISSION,
      [context.getHandler(), context.getClass()],
    );

    if (skipPermission) {
      return true;
    }

    // Get policy handlers defined for this route
    const policyHandlers = this.reflector.getAllAndOverride<
      PolicyHandlerCallback[]
    >(POLICIES_KEY, [context.getHandler(), context.getClass()]);

    // If no policies defined, restrict access by default
    if (!policyHandlers || policyHandlers.length === 0) {
      this.logger.warn(
        `No permission policies defined for route: ${context.getHandler().name}`,
      );
      throw new ForbiddenException(
        'No permission policies defined for this route',
      );
    }

    // Get request and user
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    try {
      // Create ability for user
      const ability = this.caslAbilityFactory.createForUser(user);

      // Inject services into request context
      request.serviceContext = this.getServiceContext();

      // Attach ability to request
      request.ability = ability;

      // Execute all policy handlers
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
          // Pass through NotFoundException
          if (e instanceof NotFoundException) {
            throw e;
          }

          // Transform other errors to ForbiddenException
          this.logger.error(`Policy error: ${e.message}`);
          throw new ForbiddenException(e.message || 'Permission denied');
        }
      }

      return true;
    } catch (error) {
      const e = error as Error;
      // Log error details
      this.logger.error(
        `Permission error for user ${user?.id} on ${request.method} ${request.path}: ${e.message}`,
        e.stack,
      );

      // Rethrow the error
      throw e;
    }
  }

  /**
   * Gets available services for policy handlers with proper typing
   * @returns ServiceContext object with typed service instances
   */
  private getServiceContext(): ServiceContext {
    try {
      // Type-safe service retrieval
      const serviceContext: ServiceContext = {};

      // Try to get each service and add to context if available
      try {
        serviceContext.studentsService = this.moduleRef.get<StudentsService>(
          'StudentsService',
          { strict: false },
        );
      } catch (e) {
        this.logger.debug('StudentsService not available');
      }

      try {
        serviceContext.teachersService = this.moduleRef.get<TeachersService>(
          'TeachersService',
          { strict: false },
        );
      } catch (e) {
        this.logger.debug('TeachersService not available');
      }

      try {
        serviceContext.usersService = this.moduleRef.get<UsersService>(
          'UsersService',
          { strict: false },
        );
      } catch (e) {
        this.logger.debug('UsersService not available');
      }

      return serviceContext;
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to get services: ${e.message}`);
      return {};
    }
  }
}
