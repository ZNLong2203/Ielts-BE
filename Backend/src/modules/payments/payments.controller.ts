import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/decorator/customize';
import { PaymentsService } from 'src/modules/payments/payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

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
