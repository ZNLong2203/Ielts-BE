import { OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
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
  Min,
  MinLength,
} from 'class-validator';

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

  @ApiProperty({
    example: 'admin',
    description: 'Role of the user',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;
}

export class RegisterStudentDto extends OmitType(CreateUserDto, [
  'role',
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
    example: 'student',
    description: 'Role of the user',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @ApiProperty({
    example: '20',
    description: 'Age of the student',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(100)
  age?: number;

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

export class RegisterTeacherDto extends OmitType(CreateUserDto, [
  'role',
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
    example: 'student',
    description: 'Role of the user',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

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
    example: [
      'https://example.com/certificate1.jpg',
      'https://example.com/certificate2.jpg',
    ],
    description: "URLs of the teacher's certificates",
  })
  @IsArray()
  @IsString({ each: true })
  certificate_urls: string[];
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
