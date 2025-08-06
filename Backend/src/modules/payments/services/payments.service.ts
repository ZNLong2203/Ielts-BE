import { Injectable, Logger } from '@nestjs/common';
import { Order, Payment } from 'src/casl/entities';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { VnpayService } from './vnpay.service';

// Định nghĩa interface cho payment với gateway_response
interface PaymentWithGatewayResponse extends Payment {
  gateway_response?: Record<string, any>;
  order?: Order;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly vnpayService: VnpayService,
  ) {}

  // async createPayment(
  //   userId: string,
  //   createPaymentDto: CreatePaymentDto,
  // ): Promise<PaymentResponse> {
  //   this.logger.log(
  //     `Creating payment for user ${userId} with method ${createPaymentDto.paymentMethod}`,
  //   );

  //   // Find order
  //   const order = await this.prisma.orders.findUnique({
  //     where: {
  //       id: createPaymentDto.orderId,
  //       user_id: userId,
  //       deleted: false,
  //     },
  //     include: {
  //       users: {
  //         select: {
  //           id: true,
  //           email: true,
  //           full_name: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!order) {
  //     throw new NotFoundException(
  //       `Order ${createPaymentDto.orderId} not found`,
  //     );
  //   }

  //   if (order.status !== 'pending') {
  //     return {
  //       success: false,
  //       message: `Order is already in ${order.status} status`,
  //     };
  //   }

  //   // Create payment record
  //   const payment = await this.prisma.payments.create({
  //     data: {
  //       order_id: order.id,
  //       payment_method: createPaymentDto.paymentMethod,
  //       amount: createPaymentDto.amount || order.final_amount,
  //       currency: createPaymentDto.currency || 'VND',
  //       status: PaymentStatus.PENDING,
  //     },
  //   });

  //   // Call appropriate payment service
  //   let paymentResponse: PaymentResponse;
  //   const description =
  //     createPaymentDto.orderDescription ||
  //     `Thanh toán khóa học IELTS - Mã đơn hàng: ${order.order_code || ''}`;

  //   try {
  //     switch (createPaymentDto.paymentMethod) {
  //       case PaymentMethod.STRIPE:
  //       case PaymentMethod.VISA:
  //       case PaymentMethod.MASTERCARD:
  //         paymentResponse = await this.stripeService.createPayment({
  //           orderId: order.id,
  //           amount: Number(payment.amount),
  //           currency: payment.currency,
  //           description,
  //           customerEmail: order.users?.email,
  //           metadata: {
  //             userId: userId,
  //             orderCode: order.order_code || '',
  //             paymentId: payment.id,
  //           },
  //         });
  //         break;

  //       case PaymentMethod.VNPAY:
  //         paymentResponse = await this.vnpayService.createPayment({
  //           orderId: order.id,
  //           amount: Number(payment.amount),
  //           currency: payment.currency,
  //           orderDescription: description,
  //           returnUrl: createPaymentDto.returnUrl,
  //           ipAddress: createPaymentDto.ipAddress,
  //         });
  //         break;

  //       default:
  //         return {
  //           success: false,
  //           message: `Payment method ${createPaymentDto.paymentMethod} is not supported yet`,
  //         };
  //     }

  //     // Update payment record with transaction ID
  //     if (paymentResponse.success && paymentResponse.transactionId) {
  //       await this.prisma.payments.update({
  //         where: { id: payment.id },
  //         data: {
  //           transaction_id: paymentResponse.transactionId,
  //           gateway_response: paymentResponse.data || {},
  //         },
  //       });
  //     } else {
  //       // Mark payment as failed if gateway couldn't create payment
  //       await this.prisma.payments.update({
  //         where: { id: payment.id },
  //         data: {
  //           status: PaymentStatus.FAILED,
  //           gateway_response: paymentResponse.data || {},
  //         },
  //       });
  //     }

  //     return paymentResponse;
  //   } catch (error) {
  //     // Handle errors and update payment status
  //     const errorMessage =
  //       error instanceof Error ? error.message : String(error);
  //     const errorStack = error instanceof Error ? error.stack : undefined;

  //     this.logger.error(
  //       `Error in payment creation: ${errorMessage}`,
  //       errorStack,
  //     );

  //     await this.prisma.payments.update({
  //       where: { id: payment.id },
  //       data: {
  //         status: PaymentStatus.FAILED,
  //         error_message: errorMessage,
  //       },
  //     });

  //     return {
  //       success: false,
  //       message: `Payment creation failed: ${errorMessage}`,
  //     };
  //   }
  // }

  // async handleVnpayCallback(
  //   callbackData: VnpayResponse,
  // ): Promise<PaymentResponse> {
  //   this.logger.log(
  //     `Processing VNPay callback for transaction ${callbackData.vnp_TxnRef}`,
  //   );

  //   // Validate callback from VNPay
  //   const isValid = await this.vnpayService.validateCallback(callbackData);
  //   if (!isValid) {
  //     this.logger.error('Invalid VNPay callback signature');
  //     return {
  //       success: false,
  //       message: 'Invalid signature',
  //     };
  //   }

  //   // Process payment result
  //   const paymentResult = await this.vnpayService.processCallback(callbackData);

  //   // Update payment record in database
  //   if (paymentResult.data?.orderId) {
  //     const orderId = paymentResult.data.orderId;

  //     try {
  //       // Find payment by orderId or transaction reference
  //       const payment = await this.prisma.payments.findFirst({
  //         where: {
  //           OR: [
  //             {
  //               order_id: orderId,
  //               deleted: false,
  //             },
  //             {
  //               transaction_id: callbackData.vnp_TxnRef,
  //               deleted: false,
  //             },
  //           ],
  //         },
  //       });

  //       if (!payment) {
  //         this.logger.error(`Payment not found for order ${orderId}`);
  //         return {
  //           success: false,
  //           message: 'Payment record not found',
  //         };
  //       }

  //       // Update payment status
  //       await this.prisma.payments.update({
  //         where: { id: payment.id },
  //         data: {
  //           transaction_id:
  //             callbackData.vnp_TransactionNo || payment.transaction_id || '',
  //           status: paymentResult.data.paymentStatus,
  //           gateway_response: callbackData as unknown as Record<string, any>,
  //           processed_at: new Date(),
  //         },
  //       });

  //       // If payment successful, update order status
  //       if (paymentResult.success) {
  //         await this.updateOrderStatus(orderId, 'completed');
  //       }

  //       return paymentResult;
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : String(error);
  //       const errorStack = error instanceof Error ? error.stack : undefined;

  //       this.logger.error(
  //         `Error updating payment: ${errorMessage}`,
  //         errorStack,
  //       );
  //       return {
  //         success: false,
  //         message: `Error updating payment: ${errorMessage}`,
  //       };
  //     }
  //   }

  //   return paymentResult;
  // }

  // async handleStripeWebhook(
  //   payload: string,
  //   signature: string,
  // ): Promise<PaymentResponse> {
  //   this.logger.log('Processing Stripe webhook');

  //   // Validate webhook from Stripe
  //   const isValid = await this.stripeService.validateCallback(
  //     payload,
  //     signature,
  //   );
  //   if (!isValid) {
  //     this.logger.error('Invalid Stripe webhook signature');
  //     return {
  //       success: false,
  //       message: 'Invalid signature',
  //     };
  //   }

  //   try {
  //     // Parse payload to event object
  //     const event: StripeWebhookEvent = JSON.parse(payload);

  //     // Process event
  //     const paymentResult = await this.stripeService.processCallback(event);

  //     // Update payment record in database if needed
  //     if (
  //       (paymentResult.success ||
  //         event.type.includes('payment_intent.payment_failed')) &&
  //       paymentResult.data?.orderId
  //     ) {
  //       const orderId = paymentResult.data.orderId;

  //       try {
  //         // Find payment by order ID or transaction ID
  //         const payment = await this.prisma.payments.findFirst({
  //           where: {
  //             OR: [
  //               {
  //                 order_id: orderId,
  //                 deleted: false,
  //               },
  //               {
  //                 transaction_id: paymentResult.transactionId || '',
  //                 deleted: false,
  //               },
  //             ],
  //           },
  //         });

  //         if (payment) {
  //           // Update payment record
  //           await this.prisma.payments.update({
  //             where: { id: payment.id },
  //             data: {
  //               transaction_id:
  //                 paymentResult.transactionId || payment.transaction_id || '',
  //               status: paymentResult.data.paymentStatus,
  //               gateway_response: event.data.object as unknown as Record<
  //                 string,
  //                 any
  //               >,
  //               processed_at: new Date(),
  //             },
  //           });

  //           // If payment successful, update order status
  //           if (paymentResult.data.paymentStatus === PaymentStatus.COMPLETED) {
  //             await this.updateOrderStatus(orderId, 'completed');
  //           } else if (
  //             paymentResult.data.paymentStatus === PaymentStatus.FAILED
  //           ) {
  //             // Optionally handle failed payments
  //             await this.updateOrderStatus(orderId, 'payment_failed');
  //           }
  //         } else {
  //           this.logger.warn(
  //             `No payment record found for order ${orderId} or transaction ${paymentResult.transactionId}`,
  //           );
  //         }
  //       } catch (error) {
  //         const errorMessage =
  //           error instanceof Error ? error.message : String(error);
  //         const errorStack = error instanceof Error ? error.stack : undefined;

  //         this.logger.error(
  //           `Error updating payment record: ${errorMessage}`,
  //           errorStack,
  //         );
  //       }
  //     }

  //     return paymentResult;
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : String(error);
  //     const errorStack = error instanceof Error ? error.stack : undefined;

  //     this.logger.error(
  //       `Error processing Stripe webhook: ${errorMessage}`,
  //       errorStack,
  //     );

  //     return {
  //       success: false,
  //       message: `Error processing webhook: ${errorMessage}`,
  //     };
  //   }
  // }

  // async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
  //   return await this.prisma.payments.findMany({
  //     where: {
  //       order_id: orderId,
  //       deleted: false,
  //     },
  //     orderBy: {
  //       created_at: 'desc',
  //     },
  //   });
  // }

  // async getPaymentDetails(
  //   paymentId: string,
  // ): Promise<Payment & { order: Order | null }> {
  //   const payment = await this.prisma.payments.findUnique({
  //     where: {
  //       id: paymentId,
  //       deleted: false,
  //     },
  //     include: {
  //       order: true,
  //     },
  //   });

  //   if (!payment) {
  //     throw new NotFoundException(`Payment ${paymentId} not found`);
  //   }

  //   return payment;
  // }

  // async refundPayment(
  //   paymentId: string,
  //   amount?: number,
  // ): Promise<PaymentResponse> {
  //   const payment = await this.prisma.payments.findUnique({
  //     where: {
  //       id: paymentId,
  //       deleted: false,
  //     },
  //   });

  //   if (!payment) {
  //     throw new NotFoundException(`Payment ${paymentId} not found`);
  //   }

  //   if (payment.status !== PaymentStatus.COMPLETED) {
  //     throw new BadRequestException(
  //       `Cannot refund payment in ${payment.status} status`,
  //     );
  //   }

  //   let refundResult: PaymentResponse;

  //   // Process refund based on payment method
  //   switch (payment.payment_method) {
  //     case PaymentMethod.STRIPE:
  //     case PaymentMethod.VISA:
  //     case PaymentMethod.MASTERCARD:
  //       // For Stripe refunds, we need the PaymentIntent ID
  //       const paymentIntentId = this.extractPaymentIntentId(payment);
  //       if (!paymentIntentId) {
  //         throw new BadRequestException(
  //           'Cannot extract payment intent ID for refund',
  //         );
  //       }

  //       refundResult = await this.stripeService.createRefund(
  //         paymentIntentId,
  //         amount ? amount * 100 : undefined,
  //       );
  //       break;

  //     // Add other payment methods as needed

  //     default:
  //       throw new BadRequestException(
  //         `Refunds for ${payment.payment_method} are not supported yet`,
  //       );
  //   }

  //   if (refundResult.success) {
  //     // Update payment record with refund information
  //     await this.prisma.payments.update({
  //       where: { id: paymentId },
  //       data: {
  //         status: PaymentStatus.REFUNDED,
  //         refund_id: refundResult.transactionId || null,
  //         refund_amount: amount ? new Decimal(amount) : payment.amount,
  //         refunded_at: new Date(),
  //       },
  //     });

  //     // Update order status
  //     if (payment.order_id) {
  //       await this.updateOrderStatus(payment.order_id, 'refunded');
  //     }
  //   }

  //   return refundResult;
  // }

  // private async updateOrderStatus(
  //   orderId: string,
  //   status: string,
  // ): Promise<void> {
  //   this.logger.log(`Updating order ${orderId} status to ${status}`);

  //   // Update order status
  //   await this.prisma.orders.update({
  //     where: { id: orderId },
  //     data: {
  //       status,
  //       payment_status:
  //         status === 'completed'
  //           ? 'completed'
  //           : status === 'refunded'
  //             ? 'refunded'
  //             : 'pending',
  //       updated_at: new Date(),
  //     },
  //   });

  //   // If order is complete, create enrollments for courses
  //   if (status === 'completed') {
  //     await this.createEnrollmentsFromOrder(orderId);
  //   }
  // }

  // private async createEnrollmentsFromOrder(orderId: string): Promise<void> {
  //   this.logger.log(`Creating enrollments for order ${orderId}`);

  //   // Get order and items
  //   const order = await this.prisma.orders.findUnique({
  //     where: { id: orderId },
  //     include: {
  //       order_items: {
  //         where: { deleted: false },
  //       },
  //     },
  //   });

  //   if (!order || !order.user_id) return;

  //   // Create enrollment for each course in the order
  //   for (const item of order.order_items) {
  //     if (!item.course_id) continue;

  //     // Check if enrollment already exists
  //     const existingEnrollment = await this.prisma.enrollments.findFirst({
  //       where: {
  //         user_id: order.user_id,
  //         course_id: item.course_id,
  //         deleted: false,
  //       },
  //     });

  //     // If no enrollment exists, create one
  //     if (!existingEnrollment) {
  //       await this.prisma.enrollments.create({
  //         data: {
  //           user_id: order.user_id,
  //           course_id: item.course_id,
  //           enrollment_date: new Date(),
  //           is_active: true,
  //         },
  //       });

  //       // Update course enrollment count
  //       await this.prisma.courses.update({
  //         where: { id: item.course_id },
  //         data: {
  //           enrollment_count: {
  //             increment: 1,
  //           },
  //         },
  //       });
  //     }
  //   }
  // }

  // private extractPaymentIntentId(
  //   payment: PaymentWithGatewayResponse,
  // ): string | null {
  //   // Try to extract PaymentIntent ID from gateway_response
  //   if (payment.gateway_response) {
  //     // For checkout.session completed webhook
  //     if ('payment_intent' in payment.gateway_response) {
  //       return payment.gateway_response.payment_intent as string;
  //     }

  //     // For direct PaymentIntent
  //     if (
  //       'id' in payment.gateway_response &&
  //       'object' in payment.gateway_response &&
  //       payment.gateway_response.object === 'payment_intent'
  //     ) {
  //       return payment.gateway_response.id as string;
  //     }
  //   }

  //   // If we couldn't find it in gateway_response, use transaction_id
  //   return payment.transaction_id || null;
  // }
}
