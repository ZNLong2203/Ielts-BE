import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from 'src/modules/payments/payments.controller';
import { PaymentService } from 'src/modules/payments/payments.service';
import { StripeProvider } from 'src/modules/payments/providers/stripe.provider';
import { ZaloPayProvider } from 'src/modules/payments/providers/zalopay.provider';
import { WebhookController } from 'src/modules/payments/webhook.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PaymentService, StripeProvider, ZaloPayProvider],
  controllers: [PaymentController, WebhookController],
  exports: [PaymentService],
})
export class PaymentsModule {}
