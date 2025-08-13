import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/decorator/customize';
import { PaymentsService } from 'src/modules/payments/payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create payment, return Stripe checkout URL or ZaloPay QR URL',
  })
  @ApiResponse({ status: 201, description: 'Payment created and URL returned' })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(dto);
  }

  @Get('stripe/success')
  @Public()
  async stripeSuccess(
    @Query('orderId') orderId: string,
    @Query('paymentId') paymentId: string,
    @Res() res: Response,
  ) {
    return this.paymentsService.handleSuccessfulPaymentStripe(
      orderId,
      paymentId,
      res,
    );
  }

  @Get('stripe/cancel')
  @Public()
  async stripeCancel(
    @Query('orderId') orderId: string,
    @Query('paymentId') paymentId: string,
    @Res() res: Response,
  ) {
    return this.paymentsService.handleCancelPaymentStripe(
      orderId,
      paymentId,
      res,
    );
  }
}
