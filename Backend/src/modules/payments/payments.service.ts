import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { OrderStatus } from 'src/modules/orders/dto/update-order.dto';
import {
  PaymentMethod,
  PaymentStatus,
} from 'src/modules/payments/constants/payments.constant';
import {
  PaymentForProcessing,
  PaymentRecord,
} from 'src/modules/payments/interfaces/payment.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';
import {
  CreatePaymentDto,
  PaymentCreateResponseDto,
} from './dto/create-payment.dto';
import { StripeProvider } from './providers/stripe.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentService');

  constructor(
    private readonly config: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly prisma: PrismaService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
  ): Promise<PaymentCreateResponseDto> {
    const { orderId, amount, currency, method } = dto;

    if (!orderId) {
      throw new BadRequestException('orderId required');
    }

    if (amount <= 0) {
      throw new BadRequestException('amount must > 0');
    }

    const payment = await this.prisma.payments.create({
      data: {
        order_id: orderId,
        amount,
        currency,
        payment_method: method,
        status: PaymentStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const validPayment: PaymentForProcessing = {
      id: payment.id,
      order_id: payment.order_id ? payment.order_id : orderId,
    };

    if (method === PaymentMethod.STRIPE) {
      return await this.processStripePayment(validPayment, dto);
    }

    throw new BadRequestException('Unsupported payment method');
  }

  private async processStripePayment(
    payment: PaymentForProcessing,
    dto: CreatePaymentDto,
  ): Promise<PaymentCreateResponseDto> {
    const { orderId, amount, currency, description } = dto;
    const baseUrl =
      this.config.get<string>('APP_BASE_URL') || 'http://localhost:3000';

    const successUrl = `${baseUrl}/api/v1/payments/stripe/success?orderId=${orderId}&paymentId=${payment.id}`;
    const cancelUrl = `${baseUrl}/api/v1/payments/stripe/cancel?orderId=${orderId}&paymentId=${payment.id}`;

    const session = await this.stripeProvider.createCheckoutSession({
      amountMajor: amount,
      currency,
      orderId,
      successUrl,
      cancelUrl,
      description,
    });

    await this.prisma.payments.update({
      where: { id: payment.id },
      data: {
        transaction_id: session.id,
        gateway_response: {
          provider: 'stripe',
          session_id: session.id,
          session_url: session.url,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_email,
          metadata: session.metadata,
        },
        updated_at: new Date(),
      },
    });

    return {
      paymentId: payment.id,
      provider: 'stripe',
      checkoutUrl: session.url,
    };
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    const { type, data } = event;
    const session = data.object as Stripe.Checkout.Session;

    // Sử dụng chiến lược nhất quán: thử session.id trước, sau đó payment_intent.id
    let payment = await this.findPaymentByTransactionId(session.id);

    // 2. Nếu không tìm thấy, thử tìm theo orderId từ metadata
    if (!payment && session.metadata?.orderId) {
      payment = await this.findPaymentByOrderId(session.metadata.orderId);
    }

    if (!payment) {
      this.logger.warn(
        `Stripe webhook, payment not found. Session: ${session.id}, OrderId: ${session.metadata?.orderId}`,
      );
      return;
    }

    if (
      type === 'checkout.session.completed' ||
      type === 'payment_intent.succeeded'
    ) {
      await this.updatePaymentStatus(
        payment.id,
        PaymentStatus.COMPLETED,
        event,
      );
    } else {
      await this.updatePaymentStatus(payment.id, PaymentStatus.FAILED, event);
    }
  }

  // xử lý thanh toán thành công stripe với successUrl khi được tạo để kiểm tra db đã cập nhật và chuyển hướng
  async handleSuccessfulPaymentStripe(
    orderId: string,
    paymentId: string,
    res: Response,
  ): Promise<void> {
    // find and update if necessary for db order and payment with transaction
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found or not completed');
      }

      const order = await tx.orders.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Update order and payment if necessary
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          processed_at: new Date(),
          updated_at: new Date(),
          status: PaymentStatus.COMPLETED,
        },
      });

      await tx.orders.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          payment_status: PaymentStatus.COMPLETED,
          updated_at: new Date(),
        },
      });

      await this.createComboEnrollmentPaymentRecord(
        tx,
        orderId,
        PaymentStatus.COMPLETED,
      );
    });

    // Chuyển hướng đến URL thành công
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:8000';
    const successUrl = `${frontendUrl}/payment/success?orderId=${orderId}&paymentId=${paymentId}&success=true`;
    // Triển khai logic chuyển hướng ở đây
    res.redirect(successUrl);
  }

  // xử lý hủy thanh toán stripe với cancelUrl khi được tạo để kiểm tra db đã cập nhật và chuyển hướng
  async handleCancelPaymentStripe(
    orderId: string,
    paymentId: string,
    res: Response,
  ): Promise<void> {
    // find and update if necessary for db order and payment with transaction
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found or not completed');
      }

      const order = await tx.orders.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Update order and payment if necessary
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          processed_at: new Date(),
          updated_at: new Date(),
          status: PaymentStatus.CANCELLED,
        },
      });

      await tx.orders.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          payment_status: PaymentStatus.CANCELLED,
          updated_at: new Date(),
        },
      });
    });

    // Chuyển hướng đến URL hủy
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:8000';
    const cancelUrl = `${frontendUrl}/orders?orderId=${orderId}&paymentId=${paymentId}&cancel=true`;
    res.redirect(cancelUrl);
  }

  private async findPaymentByTransactionId(
    transactionId: string,
  ): Promise<PaymentRecord | null> {
    return await this.prisma.payments.findFirst({
      where: { transaction_id: transactionId },
      select: {
        id: true,
        order_id: true,
        transaction_id: true,
        gateway_response: true,
      },
    });
  }

  private async findPaymentByOrderId(
    orderId: string,
  ): Promise<PaymentRecord | null> {
    return await this.prisma.payments.findFirst({
      where: { order_id: orderId },
      select: {
        id: true,
        order_id: true,
        transaction_id: true,
        gateway_response: true,
      },
    });
  }

  private async findPaymentById(paymentId: string) {
    return await this.prisma.payments.findUnique({
      where: { id: paymentId },
    });
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    event: Stripe.Event,
  ): Promise<void> {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      select: { gateway_response: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const currentGatewayResponse =
      (payment.gateway_response as Record<string, unknown>) ?? {};

    // sử dụng transaction
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.update({
        where: { id: paymentId },
        data: {
          status,
          processed_at: new Date(),
          updated_at: new Date(),
          gateway_response: {
            ...currentGatewayResponse,
            stripe_event: event,
          } as any,
        },
      });

      // cập nhật trạng thái đơn hàng
      // đặt trạng thái đơn hàng dựa trên trạng thái thanh toán
      const orderStatus =
        status === PaymentStatus.COMPLETED
          ? OrderStatus.COMPLETED
          : OrderStatus.FAILED;
      await tx.orders.update({
        where: { id: payment.order_id ?? '' },
        data: {
          status: orderStatus,
          payment_status: status,
        },
      });
    });
  }

  async cancelPayment(paymentId: string) {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // sử dụng transaction
    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          processed_at: new Date(),
          updated_at: new Date(),
        },
      });

      // cập nhật trạng thái đơn hàng
      const order = await tx.orders.update({
        where: { id: payment.order_id ?? '' },
        data: {
          status: OrderStatus.CANCELLED,
          payment_status: PaymentStatus.CANCELLED,
          updated_at: new Date(),
        },
      });

      return { payment, order };
    });
  }

  /**
   * Create a combo enrollment payment record and enrollments records for each course in the combo if payment is completed.
   */
  async createComboEnrollmentPaymentRecord(
    tx: Prisma.TransactionClient,
    orderId: string,
    status: PaymentStatus,
  ) {
    if (status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Payment status must be COMPLETED to create enrollment records',
      );
    }

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderItems = await this.prisma.order_items.findMany({
      where: { order_id: orderId, combo_id: { not: null } },
      include: { combo_courses: { select: { course_ids: true } } },
    });

    if (orderItems.length === 0) {
      throw new NotFoundException('Order item for combo not found');
    }

    const courseIds = orderItems.flatMap(
      (item) => item.combo_courses?.course_ids || [],
    );

    const enrollmentRecords = courseIds.map((courseId) => ({
      user_id: order.user_id,
      course_id: courseId,
    }));

    // create combo enrollment records for each combo in the order
    const uniqueComboIds = Array.from(
      new Set(orderItems.map((item) => item.combo_id!).filter(Boolean)),
    );

    for (const comboId of uniqueComboIds) {
      await tx.combo_enrollments.create({
        data: {
          user_id: order.user_id,
          combo_id,
          created_at: new Date(),
        },
      });
    }

    await tx.enrollments.createMany({
      data: enrollmentRecords,
    });
  }
}
