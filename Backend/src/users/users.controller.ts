import { Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Action } from 'src/casl/casl.interface';
import * as ISubject from 'src/casl/subject.interface';
import {
  CheckPolicies,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { MESSAGE } from 'src/common/message';

@ApiTags('User Profile')
@Controller('profile')
export class UsersController {
  // ✅ Case 1: Route công khai, bỏ qua JWT và CASL
  @ApiOperation({
    summary: 'Get public information',
    description: 'Access public information without authentication.',
  })
  @Public()
  @Get('public-info')
  getPublicInfo() {
    return MESSAGE.USER.PUBLIC_INFO;
  }

  // ✅ Case 2: Chỉ cần xác thực JWT, bỏ qua check CASL
  @ApiOperation({
    summary: 'Get my profile',
    description: 'Get current user profile with authentication required.',
  })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @Get('me')
  getMyProfile() {
    return MESSAGE.USER.USER_INFO;
  }

  // ✅ Case 3: Cần cả xác thực và quyền đọc profile
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get user profile with read permission check.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability, req) =>
    ability.can(
      Action.Read,
      new ISubject.Profile({ userId: req.user?.id as string }),
    ),
  )
  @Get()
  getProfile() {
    return MESSAGE.USER.PROFILE_INFO;
  }

  // ✅ Case 4: Cần quyền update profile
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update user profile with update permission check.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability, req) =>
    ability.can(
      Action.Update,
      new ISubject.Profile({ userId: req.user?.id as string }),
    ),
  )
  @Put()
  updateProfile() {
    return MESSAGE.USER.PROFILE_UPDATED;
  }

  // ✅ Case 5: Không cần auth hoặc permission (ví dụ health check)
  @ApiOperation({
    summary: 'Get service status',
    description: 'Check service health status without authentication.',
  })
  @Public()
  @SkipCheckPermission()
  @Get('status')
  getStatus() {
    return { status: 'ok', message: MESSAGE.USER.STATUS_OK };
  }

  // ✅ Case 6: Bị chặn nếu không có quyền delete
  @ApiOperation({
    summary: 'Delete user account',
    description: 'Delete user account with delete permission check.',
  })
  @ApiBearerAuth()
  @CheckPolicies((ability, req) =>
    ability.can(
      Action.Delete,
      new ISubject.Profile({ userId: req.user?.id as string }),
    ),
  )
  @Delete()
  deleteAccount() {
    return MESSAGE.USER.ACCOUNT_DELETED;
  }
}
