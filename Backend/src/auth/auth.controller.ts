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
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import {
  CurrentUser,
  MessageResponse,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { CreateUserDto, UserLoginDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Register user',
    description: 'Register a new user and send verification email.',
  })
  @Public()
  @Post('register')
  @MessageResponse(
    'Register successfully. Please check your email to verify your account.',
  )
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Verify email',
    description: 'Verify a user account using the token sent via email.',
  })
  @Public()
  @Get('verify')
  @MessageResponse('Email verification successful. You can now log in.')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Login using email and password credentials.',
  })
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiBody({
    description: 'Login with email and password',
    type: UserLoginDto,
  })
  @Post('login')
  @MessageResponse('Login successful')
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
  @SkipCheckPermission()
  @Post('logout')
  @MessageResponse('User has been logged out successfully!')
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
  @Public()
  @Get('refresh')
  @MessageResponse('Token has been refreshed successfully!')
  async handleRefresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(req, res);
  }
}
