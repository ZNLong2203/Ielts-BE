import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from 'src/modules/payments/services/payments.service';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Stripe')
@Controller('payments/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  // @Post('webhook')
  // @ApiOperation({ summary: 'Handle Stripe webhook events' })
  // async handleWebhook(
  //   @Req() request: RawBodyRequest<Request>,
  //   @Headers('stripe-signature') signature: string,
  // ) {
  //   this.logger.log('Received Stripe webhook');

  //   if (!signature) {
  //     this.logger.error('Missing Stripe signature header');
  //     return { received: false, error: 'Missing Stripe signature header' };
  //   }

  //   if (!request.rawBody) {
  //     this.logger.error('Missing raw body');
  //     return { received: false, error: 'Missing raw body' };
  //   }

  //   try {
  //     const payload = request.rawBody.toString();
  //     const result = await this.paymentService.handleStripeWebhook(
  //       payload,
  //       signature,
  //     );

  //     return { received: true, success: result.success };
  //   } catch (error) {
  //     this.logger.error(
  //       `Error handling Stripe webhook: ${error.message}`,
  //       error.stack,
  //     );
  //     return { received: false, error: error.message };
  //   }
  // }

  // // For development/testing purposes
  // @Post('mock-webhook')
  // @ApiOperation({ summary: 'Simulate Stripe webhook event (for development)' })
  // async mockWebhook(
  //   @Body() mockData: { orderId: string; eventType: string; email?: string },
  // ) {
  //   if (process.env.NODE_ENV === 'production') {
  //     throw new BadRequestException(
  //       'This endpoint is not available in production',
  //     );
  //   }

  //   if (!mockData.orderId || !mockData.eventType) {
  //     throw new BadRequestException('Order ID and event type are required');
  //   }

  //   // Get order information
  //   const order = await this.prisma.orders.findUnique({
  //     where: { id: mockData.orderId },
  //   });

  //   if (!order) {
  //     throw new BadRequestException('Order not found');
  //   }

  //   // Get payment record if exists
  //   const payment = await this.prisma.payments.findFirst({
  //     where: { order_id: order.id },
  //   });

  //   // Create mock event based on type
  //   let mockEvent: any;

  //   switch (mockData.eventType) {
  //     case 'checkout.session.completed':
  //       mockEvent = {
  //         id: `evt_${Date.now()}`,
  //         type: 'checkout.session.completed',
  //         data: {
  //           object: {
  //             id: payment?.transaction_id || `cs_test_${Date.now()}`,
  //             object: 'checkout.session',
  //             amount_total: order.final_amount * 100,
  //             currency: 'vnd',
  //             customer_email: mockData.email || 'test@example.com',
  //             payment_status: 'paid',
  //             status: 'complete',
  //             payment_intent: `pi_${Date.now()}`,
  //             metadata: {
  //               orderId: order.id,
  //             },
  //           },
  //         },
  //       };
  //       break;

  //     case 'checkout.session.expired':
  //       mockEvent = {
  //         id: `evt_${Date.now()}`,
  //         type: 'checkout.session.expired',
  //         data: {
  //           object: {
  //             id: payment?.transaction_id || `cs_test_${Date.now()}`,
  //             object: 'checkout.session',
  //             amount_total: order.final_amount * 100,
  //             currency: 'vnd',
  //             status: 'expired',
  //             metadata: {
  //               orderId: order.id,
  //             },
  //           },
  //         },
  //       };
  //       break;

  //     case 'payment_intent.succeeded':
  //       mockEvent = {
  //         id: `evt_${Date.now()}`,
  //         type: 'payment_intent.succeeded',
  //         data: {
  //           object: {
  //             id: `pi_${Date.now()}`,
  //             object: 'payment_intent',
  //             amount: order.final_amount * 100,
  //             currency: 'vnd',
  //             status: 'succeeded',
  //             metadata: {
  //               orderId: order.id,
  //             },
  //           },
  //         },
  //       };
  //       break;

  //     case 'payment_intent.payment_failed':
  //       mockEvent = {
  //         id: `evt_${Date.now()}`,
  //         type: 'payment_intent.payment_failed',
  //         data: {
  //           object: {
  //             id: `pi_${Date.now()}`,
  //             object: 'payment_intent',
  //             amount: order.final_amount * 100,
  //             currency: 'vnd',
  //             status: 'failed',
  //             last_payment_error: {
  //               message: 'Your card was declined.',
  //             },
  //             metadata: {
  //               orderId: order.id,
  //             },
  //           },
  //         },
  //       };
  //       break;

  //     default:
  //       throw new BadRequestException('Unsupported event type');
  //   }

  //   // Process the mock event
  //   const mockPayload = JSON.stringify(mockEvent);
  //   const result = await this.paymentService.processStripeEvent(mockEvent);

  //   return {
  //     mockEvent,
  //     result,
  //   };
  // }

  // @Get('session/:sessionId')
  // @ApiOperation({ summary: 'Check status of a Stripe checkout session' })
  // async checkSession(@Param('sessionId') sessionId: string) {
  //   try {
  //     const session =
  //       await this.paymentService.getStripeSessionStatus(sessionId);
  //     return session;
  //   } catch (error) {
  //     this.logger.error(`Error checking session: ${error.message}`);
  //     throw new BadRequestException(`Error checking session: ${error.message}`);
  //   }
  // }
}
