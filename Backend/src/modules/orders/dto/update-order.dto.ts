import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from 'src/modules/payments/constants/payments.constant';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class RetryPaymentDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.ZALOPAY,
    description: 'Phương thức thanh toán',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({
    description: 'Optional description for payment',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ApplyCouponDto {
  @ApiProperty({ description: 'Coupon code to apply' })
  @IsString()
  couponCode!: string;
}
