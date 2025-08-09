import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../constants/payments.constant';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'uuid-order',
    description: 'Order ID liên kết thanh toán',
  })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    example: 500000,
    description: 'Số tiền thanh toán (major unit)',
  })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'VND', description: 'Currency code' })
  @IsString()
  currency!: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.ZALOPAY,
    description: 'Phương thức thanh toán',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ required: false, description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ZaloPayCallbackDto {
  @ApiProperty()
  data!: any;

  @ApiProperty()
  mac!: string;
}

export class PaymentCreateResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  paymentId: string;

  @ApiProperty({ description: 'Payment provider (stripe/zalopay)' })
  provider: string;

  @ApiProperty({ description: 'Checkout URL for payment', nullable: true })
  checkoutUrl: string | null;

  @ApiPropertyOptional({ description: 'Raw provider response' })
  raw?: unknown;
}
