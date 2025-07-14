import {
  Body,
  Controller,
  Get,
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
import {
  RegisterTeacherDto,
  UserLoginDto,
} from 'src/modules/users/dto/create-user.dto';
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
  getProfile(@CurrentUser() user: IUser) {
    return this.authService.getProfile(user);
  }
}
