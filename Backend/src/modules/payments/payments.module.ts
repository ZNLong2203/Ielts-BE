import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from 'src/modules/mail/mail.module';
import { PaymentsController } from 'src/modules/payments/payments.controller';
import { PaymentsService } from 'src/modules/payments/payments.service';
import { StripeProvider } from 'src/modules/payments/providers/stripe.provider';
import { WebhookController } from 'src/modules/payments/webhook.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, MailModule],
  providers: [PaymentsService, StripeProvider],
  controllers: [PaymentsController, WebhookController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
