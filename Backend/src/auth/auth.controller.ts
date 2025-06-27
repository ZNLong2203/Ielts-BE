import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MessageResponse } from 'src/decorator/customize';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  @MessageResponse(
    'Register successfully. Please check your email to verify your account.',
  )
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Get('verify')
  @MessageResponse('Email verification successful. You can now log in.')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
