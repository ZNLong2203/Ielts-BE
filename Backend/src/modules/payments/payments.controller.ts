import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from 'src/modules/payments/payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create payment, return Stripe checkout URL or ZaloPay QR URL',
  })
  @ApiResponse({ status: 201, description: 'Payment created and URL returned' })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto);
  }
}
