import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  SECTION_TYPE,
  SectionType,
  TEST_LEVEL,
  TEST_TYPE,
  TestLevel,
  TestType,
} from 'src/modules/mock-tests/constants';

export class CreateTestSectionDto {
  @ApiProperty({
    description: 'Section name',
    example: 'Reading Section',
  })
  @IsString()
  @Length(3, 100)
  section_name: string;

  @ApiProperty({
    description: 'Section type',
    enum: SECTION_TYPE,
    example: SECTION_TYPE.READING,
  })
  @IsEnum(SECTION_TYPE)
  section_type: SectionType;

  @ApiPropertyOptional({
    description: 'Time limit in minutes',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  time_limit?: number;

  @ApiPropertyOptional({
    description: 'Section ordering',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Section instructions',
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  instructions?: string;
}

export class CreateMockTestDto {
  @ApiProperty({
    description: 'Mock test title',
    example: 'IELTS Academic Full Test 1',
  })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Test type',
    enum: TEST_TYPE,
    example: TEST_TYPE.FULL_TEST,
  })
  @IsEnum(TEST_TYPE)
  test_type: TestType;

  @ApiProperty({
    description: 'Test level',
    enum: TEST_LEVEL,
    example: TEST_LEVEL.ACADEMIC,
  })
  @IsEnum(TEST_LEVEL)
  test_level: TestLevel;

  @ApiPropertyOptional({
    description: 'Test description',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Test instructions',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Total time limit in minutes',
    example: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  time_limit?: number;

  @ApiPropertyOptional({
    description: 'Test difficulty level',
    example: 6.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(9)
  difficulty_level?: number;

  @ApiPropertyOptional({
    description: 'Whether test is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Test sections to create',
    type: [CreateTestSectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTestSectionDto)
  sections?: CreateTestSectionDto[];
}
