import { OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsString()
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  full_name: string;

  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;
}

export class RegisterUserDto extends OmitType(CreateUserDto, [
  'role',
] as const) {}

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'admin',
    description: 'Login Email',
  })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123456',
    description: 'Login Password',
  })
  readonly password: string;
}
