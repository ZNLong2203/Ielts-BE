import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'src/decorator/customize';
import { ZaloPayCallbackDto } from 'src/modules/payments/dto/create-payment.dto';
import { PaymentsService } from 'src/modules/payments/payments.service';
import { Stripe } from 'stripe';
import { StripeProvider } from './providers/stripe.provider';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private config: ConfigService,
    private paymentsService: PaymentsService,
    private stripeProvider: StripeProvider,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Stripe webhook endpoint (raw-body supported)' })
  async stripe(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const buf = req.body as Buffer;
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
      console.error(`Webhook signature verification failed.`, error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
    await this.paymentsService.handleStripeEvent(event);
    return res.json({ received: true });
  }

  @Post('zalopay')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'ZaloPay callback endpoint' })
  async zalopay(@Body() dto: ZaloPayCallbackDto, @Res() res: Response) {
    try {
      await this.paymentsService.handleZaloCallback(dto);
      return res.json({ returncode: 1, returnmessage: 'OK' });
    } catch {
      return res.status(400).json({ returncode: -1, returnmessage: 'INVALID' });
    }
  }
}
