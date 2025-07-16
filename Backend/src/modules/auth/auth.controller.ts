import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MESSAGE } from 'src/common/message';
import {
  CurrentUser,
  MessageResponse,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { LocalAuthGuard } from 'src/modules/auth/guards/local-auth.guard';
import { UpdateStudentDto } from 'src/modules/students/dto/update-student.dto';
import { UpdateTeacherDto } from 'src/modules/teachers/dto/update-teacher.dto';
import {
  RegisterTeacherDto,
  UserLoginDto,
} from 'src/modules/users/dto/create-user.dto';
import {
  UpdatePasswordDto,
  UpdateUserDto,
} from 'src/modules/users/dto/update-user.dto';
import { RegisterStudentDto } from '../../modules/users/dto/create-user.dto';
import { AuthService } from './auth.service';

@ApiExtraModels(RegisterStudentDto, RegisterTeacherDto)
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Register student',
    description: 'Register a new student and send verification email.',
  })
  @ApiBody({
    description: 'Student registration data',
    type: RegisterStudentDto,
  })
  @Public()
  @Post('register-student')
  @MessageResponse(MESSAGE.AUTH.REGISTER_SUCCESS)
  registerStudent(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  @ApiOperation({
    summary: 'Register teacher',
    description: 'Register a new teacher and send verification email.',
  })
  @ApiBody({
    description: 'Teacher registration data',
    type: RegisterTeacherDto,
  })
  @Public()
  @Post('register-teacher')
  @MessageResponse(MESSAGE.AUTH.REGISTER_SUCCESS)
  registerTeacher(@Body() dto: RegisterTeacherDto) {
    return this.authService.registerTeacher(dto);
  }

  @ApiOperation({
    summary: 'Verify email',
    description: 'Verify a user account using the token sent via email.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token',
    required: true,
    type: String,
  })
  @Public()
  @Get('verify')
  @MessageResponse(MESSAGE.AUTH.EMAIL_VERIFICATION_SUCCESS)
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Login using email and password credentials.',
  })
  @ApiBody({
    description: 'Login with email and password',
    type: UserLoginDto,
  })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @MessageResponse(MESSAGE.AUTH.LOGIN_SUCCESS)
  login(
    @Req() req: Request & { user: IUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(req.user, res);
  }

  @ApiOperation({
    summary: 'Logout',
    description: 'Logout the currently authenticated user.',
  })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @Post('logout')
  @MessageResponse(MESSAGE.AUTH.LOGOUT_SUCCESS)
  async handleLogout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: IUser,
  ) {
    return this.authService.logout(user, res);
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refresh JWT access token using refresh token stored in cookies.',
  })
  @ApiCookieAuth('refresh_token')
  @Public()
  @Get('refresh')
  @MessageResponse(MESSAGE.AUTH.TOKEN_REFRESH_SUCCESS)
  async handleRefresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(req, res);
  }

  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieve the profile information of the currently authenticated user.',
  })
  @ApiBearerAuth()
  @Get('profile')
  @MessageResponse(MESSAGE.AUTH.GET_PROFILE_SUCCESS)
  async getProfile(@CurrentUser() user: IUser) {
    return this.authService.getProfile(user);
  }

  @ApiOperation({
    summary: 'Change password',
    description:
      'Change the password of the currently authenticated user and log them out.',
  })
  @ApiBearerAuth()
  @Post('change-password')
  @ApiBody({
    description: 'Change password data',
    type: UpdatePasswordDto,
  })
  @MessageResponse(MESSAGE.AUTH.PASSWORD_RESET_SUCCESS)
  async changePassword(
    @CurrentUser() user: IUser,
    @Body() dto: UpdatePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.changePassword(user, dto, res);
  }

  @ApiOperation({
    summary: 'Update user profile by owner',
    description: 'Update user profile information with no avatar.',
  })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @ApiBody({
    type: UpdateUserDto,
    description: 'User profile data with no avatar upload',
  })
  @MessageResponse(MESSAGE.USER.PROFILE_UPDATE)
  @Patch('profile/me')
  updateProfileByOwner(
    @CurrentUser() user: IUser,
    @Body() updateProfileDto: UpdateUserDto,
  ) {
    return this.authService.updateProfile(user.id, updateProfileDto);
  }

  @ApiOperation({
    summary: 'Update a detail of a student by owner',
    description: 'Update student profile information with no avatar.',
  })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @ApiBody({
    type: UpdateStudentDto,
    description: 'User student data with no avatar upload',
  })
  @MessageResponse(MESSAGE.USER.PROFILE_UPDATE)
  @Patch('profile/student/me')
  updateStudentByOwner(
    @CurrentUser() user: IUser,
    @Body() updateProfileDto: UpdateStudentDto,
  ) {
    return this.authService.updateStudentProfile(user.id, updateProfileDto);
  }

  @ApiOperation({
    summary: 'Update a detail of a teacher by owner',
    description: 'Update teacher profile information with no avatar.',
  })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @ApiBody({
    type: UpdateTeacherDto,
    description: 'User teacher data with no avatar upload',
  })
  @MessageResponse(MESSAGE.USER.PROFILE_UPDATE)
  @Patch('profile/teacher/me')
  updateTeacherByOwner(
    @CurrentUser() user: IUser,
    @Body() updateProfileDto: UpdateTeacherDto,
  ) {
    return this.authService.updateTeacherProfile(user.id, updateProfileDto);
  }
}
