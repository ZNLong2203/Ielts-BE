import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeProvider {
  public stripe: Stripe;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')!;
    const apiVer = this.config.get<string>('STRIPE_API_VERSION')!;
    this.stripe = new Stripe(key, {
      apiVersion: apiVer as Stripe.LatestApiVersion,
    });
  }

  async createCheckoutSession(params: {
    amountMajor: number;
    currency: string;
    orderId: string;
    successUrl: string;
    cancelUrl: string;
    description?: string;
  }) {
    const {
      amountMajor,
      currency,
      orderId,
      successUrl,
      cancelUrl,
      description,
    } = params;
    const currencyLower = currency.toLowerCase();
    const unitAmount: number =
      currencyLower === 'vnd'
        ? Math.round(amountMajor)
        : Math.round(amountMajor * 100);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currencyLower,
            product_data: {
              name: `Order ${orderId}`,
              description: description ?? `Payment for order ${orderId}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId },
    });

    return session;
  }

  constructEvent(payload: Buffer, sig: string, endpointSecret: string) {
    return this.stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  }
}
