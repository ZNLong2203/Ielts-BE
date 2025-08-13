import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from './../../payments/constants/payments.constant';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID của combo mà user muốn mua',
    example: 'b19a1d77-bf39-4a8d-b14b-8c349e1dbbbf',
  })
  @IsUUID()
  comboId: string;

  @ApiProperty({
    description: 'ID của coupon áp dụng (nếu có)',
    required: false,
    example: 'c7d5e925-8518-4dbf-90f1-7f243a0dbb0f',
  })
  @IsOptional()
  @IsUUID()
  couponId?: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.ZALOPAY,
    description: 'Phương thức thanh toán',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Ghi chú đơn hàng',
    required: false,
    example: 'Ghi chú cho đơn hàng này',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
