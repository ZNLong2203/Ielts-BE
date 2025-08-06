import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

// Định nghĩa interface cho tham số của createPayment
// interface CreatePaymentParams {
//   orderId: string;
//   amount: number;
//   currency: string;
//   description?: string;
//   customerEmail?: string;
//   metadata?: Record<string, any>;
//   successUrl?: string;
//   cancelUrl?: string;
// }

@Injectable()
// implements PaymentGateway
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || 'secretKey',
      {
        apiVersion: '2025-07-30.basil',
      },
    );
  }

  // async createPayment(data: CreatePaymentParams): Promise<PaymentResponse> {
  //   try {
  //     this.logger.log(
  //       `Creating Stripe payment session for order: ${data.orderId}`,
  //     );

  //     // Format amount based on currency
  //     let amount = data.amount;
  //     if (data.currency.toUpperCase() !== 'VND') {
  //       // For currencies with cents (e.g., USD), multiply by 100
  //       amount *= 100;
  //     }

  //     // Set up success and cancel URLs
  //     const successUrl =
  //       data.successUrl ||
  //       `${this.configService.get<string>('FRONTEND_URL') || ''}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  //     const cancelUrl =
  //       data.cancelUrl ||
  //       `${this.configService.get<string>('FRONTEND_URL') || ''}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;

  //     // Tạo metadata an toàn
  //     const metadata: Record<string, string> = {
  //       orderId: data.orderId,
  //       ...(data.metadata || {}),
  //     };

  //     // Create Stripe checkout session
  //     const session = await this.stripe.checkout.sessions.create({
  //       payment_method_types: ['card'],
  //       line_items: [
  //         {
  //           price_data: {
  //             currency: data.currency.toLowerCase(),
  //             product_data: {
  //               name: data.description || `Payment for Order #${data.orderId}`,
  //               description: `Order ID: ${data.orderId}`,
  //             },
  //             unit_amount: Math.round(amount),
  //           },
  //           quantity: 1,
  //         },
  //       ],
  //       mode: 'payment',
  //       success_url: successUrl,
  //       cancel_url: cancelUrl,
  //       metadata,
  //       customer_email: data.customerEmail,
  //     });

  //     this.logger.log(`Stripe session created: ${session.id}`);

  //     return {
  //       success: true,
  //       redirectUrl: session.url,
  //       transactionId: session.id,
  //       data: session,
  //     };
  //   } catch (error) {
  //     // Xử lý lỗi type-safe
  //     let errorMessage = 'Unknown error occurred';

  //     if (error instanceof Stripe.errors.StripeError) {
  //       errorMessage = error.message;
  //     } else if (error instanceof Error) {
  //       errorMessage = error.message;
  //     }

  //     this.logger.error(
  //       `Error creating Stripe payment: ${errorMessage}`,
  //       error instanceof Error ? error.stack : undefined,
  //     );

  //     return {
  //       success: false,
  //       message: `Payment creation failed: ${errorMessage}`,
  //     };
  //   }
  // }

  // async validateCallback(payload: string, signature: string): Promise<boolean> {
  //   try {
  //     const webhookSecret = this.configService.get<string>(
  //       'STRIPE_WEBHOOK_SECRET',
  //     );
  //     if (!webhookSecret) {
  //       this.logger.error('Stripe webhook secret is not configured');
  //       return false;
  //     }

  //     // Construct and verify the event
  //     const event = this.stripe.webhooks.constructEvent(
  //       payload,
  //       signature,
  //       webhookSecret,
  //     );

  //     return !!event;
  //   } catch (error) {
  //     // Xử lý lỗi type-safe
  //     let errorMessage = 'Unknown error occurred';

  //     if (error instanceof Stripe.errors.StripeError) {
  //       errorMessage = error.message;
  //     } else if (error instanceof Error) {
  //       errorMessage = error.message;
  //     }

  //     this.logger.error(`Webhook validation error: ${errorMessage}`);
  //     return false;
  //   }
  // }

  // async processCallback(event: StripeWebhookEvent): Promise<PaymentResponse> {
  //   try {
  //     const { type, data } = event;
  //     this.logger.log(`Processing Stripe webhook event: ${type}`);

  //     // Kiểm tra data.object có tồn tại không để đảm bảo type safety
  //     if (!data || !data.object) {
  //       return {
  //         success: false,
  //         message: 'Invalid event data format',
  //       };
  //     }

  //     switch (type) {
  //       case 'checkout.session.completed': {
  //         const session = data.object as Stripe.Checkout.Session;
  //         const orderId = session.metadata?.orderId;

  //         if (!orderId) {
  //           return {
  //             success: false,
  //             message: 'Order ID not found in session metadata',
  //           };
  //         }

  //         // Chuyển đổi amount_total an toàn
  //         const amountTotal = session.amount_total || 0;
  //         const currency = (session.currency || '').toLowerCase();
  //         const amount = currency === 'vnd' ? amountTotal : amountTotal / 100;

  //         // Payment is successful
  //         return {
  //           success: true,
  //           transactionId: session.id,
  //           data: {
  //             orderId,
  //             paymentStatus: PaymentStatus.COMPLETED,
  //             paymentMethod: 'stripe',
  //             amount,
  //             gatewayResponse: session,
  //           },
  //         };
  //       }

  //       case 'checkout.session.expired': {
  //         const session = data.object as Stripe.Checkout.Session;
  //         const orderId = session.metadata?.orderId;

  //         if (!orderId) {
  //           return {
  //             success: false,
  //             message: 'Order ID not found in session metadata',
  //           };
  //         }

  //         return {
  //           success: false,
  //           transactionId: session.id,
  //           message: 'Payment session expired',
  //           data: {
  //             orderId,
  //             paymentStatus: PaymentStatus.CANCELLED,
  //             paymentMethod: 'stripe',
  //             gatewayResponse: session,
  //           },
  //         };
  //       }

  //       case 'payment_intent.succeeded': {
  //         const paymentIntent = data.object as Stripe.PaymentIntent;
  //         const metadata = paymentIntent.metadata || {};

  //         if (!metadata.orderId) {
  //           return {
  //             success: false,
  //             message: 'Order ID not found in payment intent metadata',
  //           };
  //         }

  //         // Chuyển đổi amount an toàn
  //         const amount = paymentIntent.amount || 0;
  //         const currency = (paymentIntent.currency || '').toLowerCase();
  //         const finalAmount = currency === 'vnd' ? amount : amount / 100;

  //         return {
  //           success: true,
  //           transactionId: paymentIntent.id,
  //           data: {
  //             orderId: metadata.orderId,
  //             paymentStatus: PaymentStatus.COMPLETED,
  //             paymentMethod: 'stripe',
  //             amount: finalAmount,
  //             gatewayResponse: paymentIntent,
  //           },
  //         };
  //       }

  //       case 'payment_intent.payment_failed': {
  //         const paymentIntent = data.object as Stripe.PaymentIntent;
  //         const metadata = paymentIntent.metadata || {};

  //         if (!metadata.orderId) {
  //           return {
  //             success: false,
  //             message: 'Order ID not found in payment intent metadata',
  //           };
  //         }

  //         // Xử lý last_payment_error an toàn
  //         const errorMessage =
  //           paymentIntent.last_payment_error?.message || 'Payment failed';

  //         return {
  //           success: false,
  //           transactionId: paymentIntent.id,
  //           message: errorMessage,
  //           data: {
  //             orderId: metadata.orderId,
  //             paymentStatus: PaymentStatus.FAILED,
  //             paymentMethod: 'stripe',
  //             gatewayResponse: paymentIntent,
  //           },
  //         };
  //       }

  //       default:
  //         this.logger.log(`Unhandled event type: ${type}`);
  //         return {
  //           success: true,
  //           message: 'Event received but not processed',
  //         };
  //     }
  //   } catch (error) {
  //     // Xử lý lỗi type-safe
  //     const errorMessage =
  //       error instanceof Error ? error.message : 'Unknown error';
  //     const stack = error instanceof Error ? error.stack : undefined;

  //     this.logger.error(`Error processing webhook: ${errorMessage}`, stack);
  //     return {
  //       success: false,
  //       message: `Webhook processing failed: ${errorMessage}`,
  //     };
  //   }
  // }

  // async retrieveSession(
  //   sessionId: string,
  // ): Promise<Stripe.Checkout.Session | null> {
  //   try {
  //     return await this.stripe.checkout.sessions.retrieve(sessionId);
  //   } catch (error) {
  //     // Xử lý lỗi type-safe
  //     const errorMessage =
  //       error instanceof Error ? error.message : 'Unknown error';
  //     this.logger.error(
  //       `Error retrieving session ${sessionId}: ${errorMessage}`,
  //     );
  //     return null;
  //   }
  // }

  // async createRefund(
  //   paymentIntentId: string,
  //   amount?: number,
  // ): Promise<PaymentResponse> {
  //   try {
  //     const refundParams: Stripe.RefundCreateParams = {
  //       payment_intent: paymentIntentId,
  //     };

  //     if (amount !== undefined && amount > 0) {
  //       refundParams.amount = Math.round(amount);
  //     }

  //     const refund = await this.stripe.refunds.create(refundParams);

  //     return {
  //       success: true,
  //       transactionId: refund.id,
  //       data: refund,
  //     };
  //   } catch (error) {
  //     // Xử lý lỗi type-safe
  //     const errorMessage =
  //       error instanceof Error ? error.message : 'Unknown error';
  //     this.logger.error(
  //       `Error creating refund for payment ${paymentIntentId}: ${errorMessage}`,
  //     );
  //     return {
  //       success: false,
  //       message: `Refund failed: ${errorMessage}`,
  //     };
  //   }
  // }
}
