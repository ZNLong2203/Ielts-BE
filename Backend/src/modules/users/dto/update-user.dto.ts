import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John Doe Updated',
    description: 'Updated full name of the user',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  full_name?: string;

  @ApiProperty({
    example: '+84987654321',
    description: 'Updated phone number of the user',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+\d{1,3}[- ]?)?\d{10,12}$/, {
    message: 'Phone must be a valid phone number',
  })
  phone?: string;

  @ApiProperty({
    example: 'Vietnam',
    description: 'Updated country of the user',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'Ho Chi Minh City',
    description: 'Updated city of the user',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
