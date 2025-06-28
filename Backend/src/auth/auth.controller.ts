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
import { ApiBody } from '@nestjs/swagger';
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

  @Public()
  @Post('register')
  @MessageResponse(
    'Register successfully. Please check your email to verify your account.',
  )
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Get('verify')
  @MessageResponse('Email verification successful. You can now log in.')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

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

  @SkipCheckPermission()
  @Post('logout')
  @MessageResponse('User has been logged out successfully!')
  async handleLogout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: IUser,
  ) {
    return this.authService.logout(user, res);
  }

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
