import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PaymentCallbackDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({
    description: 'Transaction ID from payment gateway',
    example: 'ch_3Nx0YwKs6MeNQYSP0g2RuqXs',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    description: 'Status from payment gateway',
    example: 'completed',
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}
