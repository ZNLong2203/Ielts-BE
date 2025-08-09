import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ZaloPayCallbackDto } from 'src/modules/payments/dto/create-payment.dto';
import { PaymentService } from 'src/modules/payments/payments.service';
import { Stripe } from 'stripe';
import { StripeProvider } from './providers/stripe.provider';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private config: ConfigService,
    private paymentService: PaymentService,
    private stripeProvider: StripeProvider,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint (raw-body supported)' })
  async stripe(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const buf = req.rawBody as Buffer;
    if (!buf) return res.status(400).send('Raw body not available');
    let event: Stripe.Event;
    try {
      event = this.stripeProvider.constructEvent(
        buf,
        sig,
        this.config.get('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch (e) {
      const error = e as Error;
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
    await this.paymentService.handleStripeEvent(event);
    return res.json({ received: true });
  }

  @Post('zalopay')
  @HttpCode(200)
  @ApiOperation({ summary: 'ZaloPay callback endpoint' })
  async zalopay(@Body() dto: ZaloPayCallbackDto, @Res() res: Response) {
    try {
      await this.paymentService.handleZaloCallback(dto);
      return res.json({ returncode: 1, returnmessage: 'OK' });
    } catch {
      return res.status(400).json({ returncode: -1, returnmessage: 'INVALID' });
    }
  }
}
