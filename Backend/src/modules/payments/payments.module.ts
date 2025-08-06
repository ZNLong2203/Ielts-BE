import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from 'src/modules/payments/controllers/payments.controller';
import { StripeWebhookController } from 'src/modules/payments/controllers/stripe-webhook.controller';
import { VnpayCallbackController } from 'src/modules/payments/controllers/vnpay-callback.controller';
import { PaymentService } from 'src/modules/payments/services/payments.service';
import { StripeService } from 'src/modules/payments/services/stripe.service';
import { VnpayService } from 'src/modules/payments/services/vnpay.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    PaymentController,
    VnpayCallbackController,
    StripeWebhookController,
  ],
  providers: [PaymentService, StripeService, VnpayService],
  exports: [PaymentService],
})
export class PaymentsModule {}
