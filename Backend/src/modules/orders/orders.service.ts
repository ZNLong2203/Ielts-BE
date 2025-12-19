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

  async createOrder(userId: string, dto: CreateOrderDto) {
    const { comboId, comboIds, couponId, paymentMethod, notes } = dto;

    const comboIdList =
      comboIds && comboIds.length > 0 ? comboIds : comboId ? [comboId] : [];

    if (comboIdList.length === 0) {
      throw new BadRequestException('comboId or comboIds is required');
    }

    // 1) fetch combo rows (combo_courses table)
    const combos = await this.prisma.combo_courses.findMany({
      where: { id: { in: comboIdList }, deleted: false },
    });

    if (!combos || combos.length === 0) {
      throw new NotFoundException('Combo not found');
    }

    // ensure all requested combos exist
    const foundIds = new Set(combos.map((c) => c.id));
    const missing = comboIdList.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Combo(s) not found: ${missing.join(', ')}`);
    }

    // check combos with this user have already purchased
    const existingCompletedOrder = await this.prisma.orders.findFirst({
      where: {
        user_id: userId,
        status: OrderStatus.COMPLETED,
        order_items: {
          some: {
            combo_id: { in: comboIdList },
          },
        },
      },
    });

    if (existingCompletedOrder) {
      throw new ConflictException(
        'User has already purchased one or more selected combos',
      );
    }

    // 2) collect all course_ids across combos
    const allCourseIds: string[] = combos.flatMap((c) => c.course_ids ?? []);
    if (allCourseIds.length === 0) {
      throw new BadRequestException('Selected combos have no courses');
    }

    const courses = await this.prisma.courses.findMany({
      where: { id: { in: allCourseIds } },
    });
    if (!courses || courses.length === 0)
      throw new BadRequestException('Courses in combos not found');

    // 3) amounts (sum over all combos)
    const totalAmount = combos.reduce(
      (sum, c) => sum + this.toNumber(c.original_price),
      0,
    ); // original total price
    const comboPrice = combos.reduce(
      (sum, c) => sum + this.toNumber(c.combo_price),
      0,
    ); // total combo price before coupon
    // internal discount from combos
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

      // kiểm tra usage_limit
      if (
        couponRecord.usage_limit &&
        couponRecord.used_count &&
        couponRecord.used_count >= couponRecord.usage_limit
      ) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      // if coupon_type == 'combo' and applicable_combos not empty => check any comboId present
      if (
        couponRecord.coupon_type === 'combo' &&
        couponRecord.applicable_combos &&
        Array.isArray(couponRecord.applicable_combos) &&
        couponRecord.applicable_combos.length > 0
      ) {
        const applicable = comboIdList.some((id) =>
          couponRecord!.applicable_combos.includes(id),
        );
        if (!applicable)
          throw new BadRequestException('Coupon not applicable for this combo');
      }

      // kiểm tra minimum_amount (so sánh với comboPrice thường)
      if (
        couponRecord.minimum_amount &&
        comboPrice < Number(couponRecord.minimum_amount)
      ) {
        throw new BadRequestException(
          'Combo price below coupon minimum amount',
        );
      }

      // tính toán giảm giá coupon
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
      // đảm bảo không vượt quá comboPrice
      if (couponDiscount > comboPrice) couponDiscount = comboPrice;
      couponDiscount = Math.round(couponDiscount * 100) / 100;
    }

    // 5) final amounts
    const finalAmount = Math.round((comboPrice - couponDiscount) * 100) / 100;
    const totalDiscount = Math.round((totalAmount - finalAmount) * 100) / 100; // overall discount applied from original_price

    // 6) create order + order_items + coupon_usage (transaction)
    const orderId = uuidv4();
    const orderCode = `ORD-${Date.now()}`;

    // prepare items payload: each course is linked with its parent combo
    const itemsPayload = courses.map((c) => {
      const parentCombo = combos.find((combo) =>
        (combo.course_ids ?? []).includes(c.id),
      );
      return {
        id: uuidv4(),
        order_id: orderId,
        course_id: c.id,
        course_title: c.title,
        combo_id: parentCombo?.id ?? combos[0].id,
        combo_name: parentCombo?.name ?? combos[0].name,
        item_type: 'course',
        price: this.toNumber(c.price),
        discount_amount: 0,
      };
    });

    // transaction: tạo đơn hàng và các mục và sử dụng coupon và tăng used_count của coupon
    await this.prisma.$transaction(async (tx) => {
      // tạo đơn hàng (sử dụng raw insert hoặc prisma model)
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

      // chèn các mục
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
            combo_id: combos[0].id,
            discount_amount: new Prisma.Decimal(couponDiscount),
          },
        });
        // tăng used_count
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
      method: paymentMethod, // 'STRIPE'
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

    // thử hủy các thanh toán đang chờ xử lý
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

    // bảo vệ đơn giản
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
    // cập nhật payment_method và payment_status của đơn hàng
    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        payment_method: dto.method,
        payment_status: PaymentStatus.PENDING,
      },
    });
    return res;
  }

  // Được gọi bởi module Payment (webhook) để đánh dấu đơn hàng đã thanh toán
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
