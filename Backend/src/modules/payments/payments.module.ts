import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from 'src/modules/payments/payments.controller';
import { PaymentsService } from 'src/modules/payments/payments.service';
import { StripeProvider } from 'src/modules/payments/providers/stripe.provider';
import { WebhookController } from 'src/modules/payments/webhook.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PaymentsService, StripeProvider],
  controllers: [PaymentsController, WebhookController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
