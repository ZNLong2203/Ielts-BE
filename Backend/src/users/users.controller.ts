import { Controller, Delete, Get, Put } from '@nestjs/common';
import { Action } from 'src/casl/casl.interface';
import * as ISubject from 'src/casl/subject.interface';
import {
  CheckPolicies,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';

@Controller('profile')
export class UsersController {
  // ✅ Case 1: Route công khai, bỏ qua JWT và CASL
  @Public()
  @Get('public-info')
  getPublicInfo() {
    return 'Anyone can access this public info';
  }

  // ✅ Case 2: Chỉ cần xác thực JWT, bỏ qua check CASL
  @SkipCheckPermission()
  @Get('me')
  getMyProfile() {
    return 'User info (auth required, no permission check)';
  }

  // ✅ Case 3: Cần cả xác thực và quyền đọc profile
  @CheckPolicies((ability, req) =>
    ability.can(
      Action.Read,
      new ISubject.Profile({ userId: req.user?.id as string }),
    ),
  )
  @Get()
  getProfile() {
    return 'User profile (permission required)';
  }

  // ✅ Case 4: Cần quyền update profile
  @CheckPolicies((ability, req) =>
    ability.can(
      Action.Update,
      new ISubject.Profile({ userId: req.user?.id as string }),
    ),
  )
  @Put()
  updateProfile() {
    return 'Profile updated (permission required)';
  }

  // ✅ Case 5: Không cần auth hoặc permission (ví dụ health check)
  @Public()
  @SkipCheckPermission()
  @Get('status')
  getStatus() {
    return { status: 'ok' };
  }

  // ✅ Case 6: Bị chặn nếu không có quyền delete
  @CheckPolicies((ability, req) =>
    ability.can(
      Action.Delete,
      new ISubject.Profile({ userId: req.user?.id as string }),
    ),
  )
  @Delete()
  deleteAccount() {
    return 'Account deleted (permission required)';
  }
}
