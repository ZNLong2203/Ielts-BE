import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { coupons, Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateOrderDto } from 'src/modules/orders/dto/create-order.dto';
import {
  OrderStatus,
  RetryPaymentDto,
  UpdateOrderStatusDto,
} from 'src/modules/orders/dto/update-order.dto';
import { PaymentStatus } from 'src/modules/payments/constants/payments.constant';
import { PaymentsService } from 'src/modules/payments/payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentsService,
    private utilsService: UtilsService,
  ) {}

  private toNumber(
    value: null | undefined | string | number | { toNumber: () => number },
  ): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (typeof value.toNumber === 'function') return value.toNumber();
    return Number(value);
  }

  /**
   * Create order from comboId.
   * - combo.original_price used as total_amount
   * - combo.combo_price used as base after combo discount
   * - coupon (if any) applies on combo_price (not on original_price)
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const { comboId, couponId, paymentMethod, notes } = dto;

    // 1) fetch combo row (combo_courses table)
    const combo = await this.prisma.combo_courses.findUnique({
      where: { id: comboId, deleted: false },
    });

    if (!combo) throw new NotFoundException('Combo not found');

    // check combo with this user has already purchased
    const hasPurchased = await this.prisma.orders.findFirst({
      where: {
        user_id: userId,
        order_items: {
          some: {
            combo_id: comboId,
          },
        },
        status: OrderStatus.COMPLETED,
      },
    });

    if (hasPurchased) {
      throw new ConflictException('User has already purchased this combo');
    }

    // 2) course_ids array -> fetch courses
    const courseIds: string[] = combo.course_ids ?? [];
    if (courseIds.length === 0)
      throw new BadRequestException('Combo has no courses');

    const courses = await this.prisma.courses.findMany({
      where: { id: { in: courseIds } },
    });
    if (!courses || courses.length === 0)
      throw new BadRequestException('Courses in combo not found');

    // 3) amounts
    const totalAmount = this.toNumber(combo.original_price); // original_price
    const comboPrice = this.toNumber(combo.combo_price); // price to pay for combo before coupon
    // combo internal discount
    const internalComboDiscount = Math.max(0, totalAmount - comboPrice);

    // 4) coupon validation and compute coupon discount (applied on comboPrice)
    let couponRecord: coupons | null = null;
    let couponDiscount = 0;
    if (couponId) {
      couponRecord = await this.prisma.coupons.findUnique({
        where: { id: couponId, deleted: false },
      });
      if (!couponRecord) throw new BadRequestException('Coupon not found');
      if (!couponRecord.is_active)
        throw new BadRequestException('Coupon is not active');
      const now = new Date();
      if (couponRecord.valid_from && now < couponRecord.valid_from)
        throw new BadRequestException('Coupon not started yet');
      if (couponRecord.valid_until && now > couponRecord.valid_until)
        throw new BadRequestException('Coupon expired');

      // check usage_limit
      if (
        couponRecord.usage_limit &&
        couponRecord.used_count &&
        couponRecord.used_count >= couponRecord.usage_limit
      ) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      // if coupon_type == 'combo' and applicable_combos not empty => check comboId present
      if (
        couponRecord.coupon_type === 'combo' &&
        couponRecord.applicable_combos &&
        Array.isArray(couponRecord.applicable_combos) &&
        couponRecord.applicable_combos.length > 0
      ) {
        const applicable = couponRecord.applicable_combos.includes(comboId);
        if (!applicable)
          throw new BadRequestException('Coupon not applicable for this combo');
      }

      // minimum_amount check (compare with comboPrice usually)
      if (
        couponRecord.minimum_amount &&
        comboPrice < Number(couponRecord.minimum_amount)
      ) {
        throw new BadRequestException(
          'Combo price below coupon minimum amount',
        );
      }

      // compute coupon discount
      if (couponRecord.discount_type === 'percentage') {
        couponDiscount =
          (comboPrice * Number(couponRecord.discount_value)) / 100;
      } else {
        couponDiscount = Number(couponRecord.discount_value);
      }
      if (
        couponRecord.maximum_discount &&
        couponDiscount > Number(couponRecord.maximum_discount)
      ) {
        couponDiscount = Number(couponRecord.maximum_discount);
      }
      // ensure not exceed comboPrice
      if (couponDiscount > comboPrice) couponDiscount = comboPrice;
      couponDiscount = Math.round(couponDiscount * 100) / 100;
    }

    // 5) final amounts
    const finalAmount = Math.round((comboPrice - couponDiscount) * 100) / 100;
    const totalDiscount = Math.round((totalAmount - finalAmount) * 100) / 100; // overall discount applied from original_price

    // 6) create order + order_items + coupon_usage (transaction)
    const orderId = uuidv4();
    const orderCode = `ORD-${Date.now()}`;

    // prepare items payload
    const itemsPayload = courses.map((c) => ({
      id: uuidv4(),
      order_id: orderId,
      course_id: c.id,
      course_title: c.title,
      combo_id: combo.id,
      combo_name: combo.name,
      item_type: 'course',
      price: this.toNumber(c.price),
      discount_amount: 0,
    }));

    // transaction: create order and items and coupon usage and increment coupon.used_count
    await this.prisma.$transaction(async (tx) => {
      // create order (use raw insert or prisma model)
      await tx.orders.create({
        data: {
          id: orderId,
          user_id: userId,
          order_code: orderCode,
          total_amount: new Prisma.Decimal(totalAmount),
          discount_amount: new Prisma.Decimal(totalDiscount),
          final_amount: new Prisma.Decimal(finalAmount),
          status: OrderStatus.PENDING,
          payment_method: paymentMethod,
          payment_status: PaymentStatus.PENDING,
          notes: notes ?? null,
        },
      });

      // insert items
      for (const it of itemsPayload) {
        await tx.order_items.create({
          data: {
            id: it.id,
            order_id: it.order_id,
            course_id: it.course_id,
            course_title: it.course_title,
            combo_id: it.combo_id,
            combo_name: it.combo_name,
            item_type: it.item_type,
            price: new Prisma.Decimal(it.price),
            discount_amount: new Prisma.Decimal(it.discount_amount),
          },
        });
      }

      if (couponRecord) {
        await tx.coupon_usage.create({
          data: {
            id: uuidv4(),
            coupon_id: couponRecord.id,
            user_id: userId,
            order_id: orderId,
            combo_id: combo.id,
            discount_amount: new Prisma.Decimal(couponDiscount),
          },
        });
        // increment used_count
        await tx.coupons.update({
          where: { id: couponRecord.id },
          data: { used_count: { increment: 1 } },
        });
      }
    });

    // 7) call PaymentService to create payment (outside transaction)
    const paymentDto = {
      orderId,
      amount: finalAmount,
      currency: 'VND',
      method: paymentMethod, // 'ZALOPAY' or 'STRIPE'
      description: `Payment for order ${orderCode}`,
    };

    const paymentResult = await this.paymentService.createPayment(paymentDto);

    // 8) return created order summary + payment result
    const createdOrder = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { order_items: true, payments: true },
    });

    return { order: createdOrder, payment: paymentResult };
  }

  async listOrders(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.ordersWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    return this.utilsService.paginate({
      model: this.prisma.orders,
      query,
      defaultOrderBy: { created_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        order_code: true,
        total_amount: true,
        discount_amount: true,
        final_amount: true,
        status: true,
        payment_method: true,
        payment_status: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { order_items: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.COMPLETED)
      throw new ConflictException('Cannot cancel completed order');

    // try cancel pending payments
    const pendingPayment = order.payments?.find(
      (p) => p.status === PaymentStatus.PENDING,
    );
    if (pendingPayment) {
      try {
        return await this.paymentService.cancelPayment(pendingPayment.id);
      } catch (err) {
        const e = err as Error;
        this.logger.warn('Cancel payment failed: ' + e.message);
        throw new ConflictException('Cancel payment failed');
      }
    }
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    // simple guard
    if (
      order.status === OrderStatus.COMPLETED &&
      dto.status !== OrderStatus.COMPLETED
    )
      throw new ConflictException('Cannot change completed order');

    const updated = await this.prisma.orders.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
    return updated;
  }

  async softDelete(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.orders.update({
      where: { id: orderId },
      data: { deleted: true },
    });
    return { ok: true };
  }

  async retryPayment(orderId: string, dto: RetryPaymentDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.COMPLETED)
      throw new BadRequestException('Order already completed');

    const paymentDto = {
      orderId,
      amount: this.toNumber(order.final_amount),
      currency: 'VND',
      method: dto.method,
      description:
        dto.description ?? `Retry payment for order ${order.order_code}`,
    };

    const res = await this.paymentService.createPayment(paymentDto);
    // update order payment_method and payment_status
    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        payment_method: dto.method,
        payment_status: PaymentStatus.PENDING,
      },
    });
    return res;
  }

  // Called by Payment module (webhook) to mark order paid
  async markOrderPaid(orderId: string) {
    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        payment_status: PaymentStatus.COMPLETED,
        updated_at: new Date(),
      },
    });
  }
}
