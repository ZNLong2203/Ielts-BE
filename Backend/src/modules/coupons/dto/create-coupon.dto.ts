import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  COUPONS_DISCOUNT_TYPE,
  CouponsDiscountType,
} from './../../../common/constants/coupons';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Coupon code (unique)',
    example: 'SUMMER2023',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Coupon name',
    example: 'Summer Discount 2023',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Coupon description',
    example: 'Get 20% off all summer courses',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Discount type (percentage or fixed amount)',
    enum: COUPONS_DISCOUNT_TYPE,
    example: COUPONS_DISCOUNT_TYPE.PERCENTAGE,
  })
  @IsEnum(COUPONS_DISCOUNT_TYPE)
  @IsNotEmpty()
  discount_type: CouponsDiscountType;

  @ApiProperty({
    description: 'Discount value (percentage or amount)',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_value: number;

  @ApiPropertyOptional({
    description: 'Minimum order amount required to use coupon',
    example: 100000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minimum_amount?: number;

  @ApiPropertyOptional({
    description: 'Maximum discount amount when using percentage',
    example: 500000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maximum_discount?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of times coupon can be used',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  usage_limit?: number;

  @ApiProperty({
    description: 'Coupon valid from date',
    example: '2023-06-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  valid_from: Date;

  @ApiProperty({
    description: 'Coupon valid until date',
    example: '2023-08-31T23:59:59.000Z',
  })
  @IsDate()
  @Type(() => Date)
  valid_until: Date;

  @ApiPropertyOptional({
    description: 'Whether coupon is active',
    default: true,
  })
  @IsBoolean()
  is_active: boolean;

  @ApiPropertyOptional({
    description: 'Combo IDs this coupon applies to (empty for all courses)',
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  applicable_combos: string[];
}

export class ApplyCouponDto {
  @ApiProperty({
    description: 'Coupon code to apply',
    example: 'SUMMER2023',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Combo IDs to apply coupon for',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  combo_ids: string[];
}

export class ValidateCouponDto {
  @ApiProperty({
    description: 'Coupon code to validate',
    example: 'SUMMER2023',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Combo IDs to validate coupon for',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  combo_ids: string[];

  @ApiPropertyOptional({
    description: 'Total cart amount before discount',
    example: 1000000,
  })
  @IsOptional()
  total_amount?: number;
}
