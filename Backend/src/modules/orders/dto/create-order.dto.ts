import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from './../../payments/constants/payments.constant';

export class CreateOrderDto {
  @ApiProperty({
    description:
      'ID of the combo the user wants to purchase (legacy – used when buying a single combo only)',
    example: 'b19a1d77-bf39-4a8d-b14b-8c349e1dbbbf',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  comboId?: string;

  @ApiProperty({
    description:
      'List of combo IDs the user wants to purchase (preferred for multi-combo learning paths)',
    required: false,
    isArray: true,
    example: [
      'b19a1d77-bf39-4a8d-b14b-8c349e1dbbbf',
      '6a33a1b5-9f1e-4bcb-9c8d-3e5d0f6f1234',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  comboIds?: string[];

  @ApiProperty({
    description: 'ID of the applied coupon (optional)',
    required: false,
    example: 'c7d5e925-8518-4dbf-90f1-7f243a0dbb0f',
  })
  @IsOptional()
  @IsUUID()
  couponId?: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.ZALOPAY,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Order notes',
    required: false,
    example: 'Ghi chú cho đơn hàng này',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
