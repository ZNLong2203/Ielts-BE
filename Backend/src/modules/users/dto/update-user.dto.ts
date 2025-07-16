import { PartialType, PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { USER_STATUS, UserStatus } from 'src/common/constants/user';

import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserGender } from 'src/common/constants';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, [
    'full_name',
    'phone',
    'date_of_birth',
    'gender',
    'country',
    'city',
  ] as const),
) {
  @ApiProperty({
    example: 'John Doe Updated',
    description: 'Updated full name of the user',
  })
  full_name?: string;

  @ApiProperty({
    example: '+84987654321',
    description: 'Updated phone number of the user',
  })
  phone?: string;

  @ApiProperty({
    example: 'Vietnam',
    description: 'Updated country of the user',
  })
  country?: string;

  @ApiProperty({
    example: 'Ho Chi Minh City',
    description: 'Updated city of the user',
  })
  city?: string;

  @ApiProperty({
    example: '20',
    description: 'Age of the student',
    required: false,
  })
  date_of_birth?: Date;

  @ApiProperty({
    example: 'male',
    description: 'Gender of the student',
    required: false,
  })
  gender?: UserGender;
}

export class UpdateEmailDto {
  @ApiProperty({
    example: 'student@gmail.com',
    description: 'Email of the student',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Email must be a valid email address',
  })
  @MinLength(5, { message: 'Email must be at least 5 characters long' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class UpdateStatusDto {
  @ApiProperty({
    enum: USER_STATUS,
    description: 'Status of the user',
  })
  @IsEnum(USER_STATUS, {
    message: `Status must be one of the following: ${Object.values(USER_STATUS).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: UserStatus;
}

export class UpdatePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  current_password: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @IsNotEmpty()
  new_password: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}
