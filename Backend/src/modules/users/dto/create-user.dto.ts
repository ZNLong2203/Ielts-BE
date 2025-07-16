import { PickType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxDate,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  USER_GENDER,
  USER_STATUS,
  UserGender,
  UserStatus,
} from 'src/common/constants';

export enum TeacherSpecialization {
  READING = 'reading',
  WRITING = 'writing',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class CreateUserDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'User email',
  })
  @IsEmail({}, { message: 'Invalid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'User password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  full_name: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  @Matches(/^(\+\d{1,3}[- ]?)?\d{10,12}$/, {
    message: 'Phone must be a valid phone number',
  })
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date_of_birth?: Date;

  @ApiPropertyOptional({ enum: USER_GENDER, description: 'Gender' })
  @IsEnum(USER_GENDER, { message: 'Gender must be male, female, or other' })
  @IsOptional()
  gender?: UserGender = USER_GENDER.OTHER;

  @ApiPropertyOptional({ description: 'Country of residence' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'City of residence' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    enum: USER_STATUS,
    description: 'Status of the user account',
  })
  @IsEnum(USER_STATUS, {
    message: 'Status must be active, inactive, or banned',
  })
  @IsOptional()
  status?: UserStatus = USER_STATUS.ACTIVE;
}

export class RegisterStudentDto extends PickType(CreateUserDto, [
  'email',
  'password',
  'full_name',
  'gender',
  'country',
  'city',
  'date_of_birth',
] as const) {
  @ApiProperty({
    example: 'student@gmail.com',
    description: 'Student email for registration',
  })
  email: string;

  @ApiProperty({
    example: '123456789',
    description: 'Student password (minimum 8 characters)',
  })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the student',
  })
  full_name: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Date of birth of the student',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date_of_birth?: Date;

  @ApiProperty({
    example: 'male',
    description: 'Gender of the student',
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    example: 'Vietnam',
    description: 'Country of the student',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'Hanoi',
    description: 'City of the student',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'Beginner',
    description: 'Current English level of the student',
    required: false,
  })
  @IsOptional()
  @IsString()
  english_level?: string;

  @ApiProperty({
    example: '6.5',
    description: 'Target IELTS band score',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  target_band_score?: number;
}

export class RegisterTeacherDto extends PickType(CreateUserDto, [
  'email',
  'password',
  'full_name',
  'phone',
  'date_of_birth',
  'gender',
  'country',
  'city',
] as const) {
  @ApiProperty({
    example: 'student@gmail.com',
    description: 'Student email for registration',
  })
  email: string;

  @ApiProperty({
    example: '123456789',
    description: 'Student password (minimum 8 characters)',
  })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the student',
  })
  full_name: string;

  @ApiProperty({
    example: '+84123456789',
    description: 'Phone number of the teacher',
  })
  @IsString()
  @Matches(/^(\+\d{1,3}[- ]?)?\d{10,12}$/, {
    message: 'Phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Date of birth of the teacher',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @MaxDate(new Date(new Date().getFullYear() - 18, 0, 1))
  date_of_birth?: Date;

  @ApiProperty({
    example: 'male',
    description: 'Gender of the teacher',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    example: 'Vietnam',
    description: 'Country of the teacher',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'Hanoi',
    description: 'City of the teacher',
  })
  @IsOptional()
  @IsString()
  city?: string;

  // Teacher-specific fields
  @ApiProperty({
    example: 'Master of Arts in English',
    description: 'Qualification of the teacher',
  })
  @IsNotEmpty()
  @IsString()
  qualification: string;

  @ApiProperty({
    example: 5,
    description: 'Years of experience of the teacher',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(50) // Reasonable upper bound
  experience_years: number;

  @ApiProperty({
    example: ['reading', 'writing'],
    description: 'Specializations of the teacher',
  })
  @IsNotEmpty()
  @IsArray()
  @IsEnum(TeacherSpecialization, { each: true })
  specializations: TeacherSpecialization[];

  @ApiProperty({
    example: 7,
    description: 'IELTS band score of the teacher',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(9)
  ielts_band_score: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Certificate file (PDF or image, max 5MB)',
    required: false,
  })
  file?: any;
}

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
