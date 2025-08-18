import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { ZaloPayProvider } from './providers/zalopay.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentService');

  constructor(
    private readonly config: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly zaloProvider: ZaloPayProvider,
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

    if (method === PaymentMethod.ZALOPAY) {
      return await this.processZaloPayPayment(validPayment, dto);
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

  private async processZaloPayPayment(
    payment: { id: string; order_id: string },
    dto: CreatePaymentDto,
  ): Promise<PaymentCreateResponseDto> {
    const { orderId, amount, description } = dto;
    const baseUrl =
      this.config.get<string>('APP_BASE_URL') || 'http://localhost:3000';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || baseUrl;
    const returnUrl = `${baseUrl}/webhooks/zalopay`;
    const redirectUrl = `${frontendUrl}/zalopay-success?order=${orderId}&paymentId=${payment.id}`;

    // find all order items
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    const orderItems = await this.prisma.order_items.findMany({
      where: { order_id: orderId },
      include: { combo_courses: true, courses: true },
    });

    const resp = await this.zaloProvider.createOrder(
      amount,
      order,
      description,
      returnUrl,
      redirectUrl,
      orderItems,
    );

    if (resp.respData.return_code !== 1) {
      this.logger.error(
        `ZaloPay create order failed: ${resp.respData.return_message}`,
      );

      // update payment status
      await this.updateZaloPaymentStatus(
        payment.id,
        PaymentStatus.FAILED,
        '',
        returnUrl,
      );

      throw new Error(
        'ZaloPay create order failed: ' +
          resp.respData.return_message +
          ', ' +
          resp.respData.sub_return_message,
      );
    }

    const checkoutUrl = resp.respData?.order_url ?? null;

    await this.prisma.payments.update({
      where: { id: payment.id },
      data: {
        transaction_id: resp.appTransId,
        gateway_response: {
          provider: 'zalopay',
          app_trans_id: resp.appTransId,
          return_code: resp.respData.return_code,
          return_message: resp.respData.return_message,
          order_url: resp.respData.order_url,
          zp_trans_token: resp.respData.zp_trans_token,
        },
        updated_at: new Date(),
      },
    });

    return {
      paymentId: payment.id,
      provider: 'zalopay',
      checkoutUrl,
      raw: resp.respData,
    };
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    const { type, data } = event;
    const session = data.object as Stripe.Checkout.Session;

    // Use consistent strategy: try session.id first, then payment_intent.id
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

  async handleZaloCallback(
    body: unknown,
  ): Promise<{ return_code: number; return_message: string }> {
    const verified = this.zaloProvider.verifyCallback(
      body as { data: string; mac: string },
    );

    if (!verified.valid) {
      throw new BadRequestException(
        `Invalid ZaloPay callback: ${verified.reason}`,
      );
    }

    const data = verified.data;
    if (!data) {
      throw new BadRequestException('No callback data received');
    }

    const appTransId = data.app_trans_id;
    const zpTransId = data.zp_trans_id.toString();

    const payment = await this.findPaymentByTransactionId(appTransId);

    if (!payment) {
      this.logger.warn(`Zalo callback, payment not found: ${appTransId}`);
      return { return_code: 0, return_message: 'Payment not found' };
    }

    // ZaloPay uses return_code 1 for success
    const isSuccess = data.app_id > 0; // Valid app_id indicates success

    if (isSuccess) {
      await this.updateZaloPaymentStatus(
        payment.id,
        PaymentStatus.COMPLETED,
        zpTransId,
        data,
      );
      return { return_code: 1, return_message: 'success' };
    } else {
      await this.updateZaloPaymentStatus(
        payment.id,
        PaymentStatus.FAILED,
        zpTransId,
        data,
      );
      return { return_code: 0, return_message: 'payment failed' };
    }
  }

  // handle successful payment stripe with successUrl when created to check db updated and redirect
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
        data: { status: PaymentStatus.COMPLETED },
      });

      await tx.orders.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          payment_status: PaymentStatus.COMPLETED,
        },
      });
    });

    // Redirect to success URL
    const successUrl = `${this.config.get<string>('FRONTEND_URL')}/order-success?orderId=${orderId}&paymentId=${paymentId}`;
    // Implement redirection logic here
    res.redirect(successUrl);
  }

  // handle cancel payment stripe with cancelUrl when created to check db updated and redirect
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
        data: { status: PaymentStatus.CANCELLED },
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

    // Redirect to cancel URL
    const cancelUrl = `${this.config.get<string>('FRONTEND_URL')}/order-cancelled?orderId=${orderId}&paymentId=${paymentId}`;
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

  // call ZALOPAY_QUERY_ENDPOINT to retrieve payment information
  async findPaymentByZaloId(
    app_trans_id: string,
  ): Promise<PaymentRecord | null> {
    const resp =
      await this.zaloProvider.findPaymentStatusByAppTransId(app_trans_id);
    if (!resp) {
      return null;
    }

    return resp;
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

    // use transaction
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

      // update order status
      // set order status based on payment status
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

  private async updateZaloPaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    zpTransId: string,
    callbackData: unknown,
  ): Promise<void> {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      select: { gateway_response: true, transaction_id: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const currentGatewayResponse =
      (payment.gateway_response as Record<string, unknown>) ?? {};

    // use transaction
    await this.prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payments.update({
        where: { id: paymentId },
        data: {
          status,
          processed_at: new Date(),
          updated_at: new Date(),
          transaction_id: zpTransId || payment.transaction_id,
          gateway_response: {
            ...currentGatewayResponse,
            zalopay_callback: callbackData,
          } as any,
        },
      });

      // update order status
      // set order status based on payment status
      const orderStatus =
        status === PaymentStatus.COMPLETED
          ? OrderStatus.COMPLETED
          : OrderStatus.FAILED;
      await tx.orders.update({
        where: { id: paymentUpdate.order_id ?? '' },
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

    // use transaction
    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          processed_at: new Date(),
          updated_at: new Date(),
        },
      });

      // update order status
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
}
