import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'URL to redirect to for payment',
    example: 'https://checkout.stripe.com/pay/cs_test_...',
  })
  redirectUrl?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway',
    example: 'ch_3Nx0YwKs6MeNQYSP0g2RuqXs',
  })
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Message explaining the result',
    example: 'Payment successfully initiated',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Additional data',
  })
  data?: any;
}
