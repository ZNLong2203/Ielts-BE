// src/modules/coupons/services/coupons.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { COUPONS_DISCOUNT_TYPE } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  ApplyCouponDto,
  CreateCouponDto,
  ValidateCouponDto,
} from 'src/modules/coupons/dto/create-coupon.dto';
import { UpdateCouponDto } from 'src/modules/coupons/dto/update-coupon.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}

  /**
   * Create a new coupon
   */
  async create(createCouponDto: CreateCouponDto, userId: string) {
    // Check if coupon code already exists
    const existingCoupon = await this.prisma.coupons.findFirst({
      where: {
        code: createCouponDto.code,
        deleted: false,
      },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    // Validate date range
    const now = new Date();
    if (createCouponDto.valid_from < now) {
      throw new BadRequestException('Valid from date must be in the future');
    }

    if (createCouponDto.valid_until <= createCouponDto.valid_from) {
      throw new BadRequestException(
        'Valid until date must be after valid from date',
      );
    }

    // Validate discount value based on type
    if (
      createCouponDto.discount_type === COUPONS_DISCOUNT_TYPE.PERCENTAGE &&
      createCouponDto.discount_value > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    // Create coupon
    return this.prisma.coupons.create({
      data: {
        code: createCouponDto.code,
        name: createCouponDto.name,
        description: createCouponDto.description,
        discount_type: createCouponDto.discount_type,
        discount_value: createCouponDto.discount_value,
        minimum_amount: createCouponDto.minimum_amount,
        maximum_discount: createCouponDto.maximum_discount,
        usage_limit: createCouponDto.usage_limit,
        valid_from: createCouponDto.valid_from,
        valid_until: createCouponDto.valid_until,
        is_active: createCouponDto.is_active,
        applicable_combos: createCouponDto.applicable_combos,
        created_by: userId,
      },
    });
  }

  /**
   * Find all coupons with pagination and filters
   */
  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.couponsWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    whereCondition.deleted = false;

    return this.utilsService.paginate({
      model: this.prisma.coupons,
      query,
      defaultOrderBy: { created_at: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        discount_type: true,
        discount_value: true,
        minimum_amount: true,
        maximum_discount: true,
        usage_limit: true,
        valid_from: true,
        valid_until: true,
        is_active: true,
        applicable_combos: true,
        created_at: true,
        updated_at: true,
      },
      where: whereCondition,
    });
  }

  /**
   * Find one coupon by ID
   */
  async findOne(id: string) {
    const coupon = await this.prisma.coupons.findFirst({
      where: { id, deleted: false },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        coupon_usage: {
          where: { deleted: false },
          select: {
            id: true,
            user_id: true,
            order_id: true,
            discount_amount: true,
            used_at: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return {
      ...coupon,
      created_by: coupon.created_by
        ? {
            id: coupon.users?.id,
            name: coupon.users?.full_name,
            email: coupon.users?.email,
          }
        : null,
    };
  }

  /**
   * Update coupon by ID
   */
  async update(id: string, updateCouponDto: UpdateCouponDto) {
    // Check if coupon exists
    const coupon = await this.prisma.coupons.findFirst({
      where: { id, deleted: false },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Check code uniqueness if changing code
    if (updateCouponDto.code && updateCouponDto.code !== coupon.code) {
      const existingCoupon = await this.prisma.coupons.findFirst({
        where: {
          code: updateCouponDto.code,
          id: { not: id },
          deleted: false,
        },
      });

      if (existingCoupon) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    // Validate discount value based on type if changing
    if (
      updateCouponDto.discount_type === COUPONS_DISCOUNT_TYPE.PERCENTAGE &&
      updateCouponDto.discount_value &&
      updateCouponDto.discount_value > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    // Validate date range if changing dates
    if (updateCouponDto.valid_from && updateCouponDto.valid_until) {
      if (updateCouponDto.valid_until <= updateCouponDto.valid_from) {
        throw new BadRequestException(
          'Valid until date must be after valid from date',
        );
      }
    } else if (updateCouponDto.valid_from && !updateCouponDto.valid_until) {
      if (coupon.valid_until <= updateCouponDto.valid_from) {
        throw new BadRequestException(
          'Valid until date must be after valid from date',
        );
      }
    } else if (!updateCouponDto.valid_from && updateCouponDto.valid_until) {
      if (updateCouponDto.valid_until <= coupon.valid_from) {
        throw new BadRequestException(
          'Valid until date must be after valid from date',
        );
      }
    }

    // Update coupon
    return this.prisma.coupons.update({
      where: { id },
      data: {
        ...(updateCouponDto.code && {
          code: updateCouponDto.code,
        }),
        ...(updateCouponDto.name && { name: updateCouponDto.name }),
        ...(updateCouponDto.description !== undefined && {
          description: updateCouponDto.description,
        }),
        ...(updateCouponDto.discount_type && {
          discount_type: updateCouponDto.discount_type,
        }),
        ...(updateCouponDto.discount_value !== undefined && {
          discount_value: updateCouponDto.discount_value,
        }),
        ...(updateCouponDto.minimum_amount !== undefined && {
          minimum_amount: updateCouponDto.minimum_amount,
        }),
        ...(updateCouponDto.maximum_discount !== undefined && {
          maximum_discount: updateCouponDto.maximum_discount,
        }),
        ...(updateCouponDto.usage_limit !== undefined && {
          usage_limit: updateCouponDto.usage_limit,
        }),
        ...(updateCouponDto.valid_from && {
          valid_from: updateCouponDto.valid_from,
        }),
        ...(updateCouponDto.valid_until && {
          valid_until: updateCouponDto.valid_until,
        }),
        ...(updateCouponDto.is_active !== undefined && {
          is_active: updateCouponDto.is_active,
        }),
        ...(updateCouponDto.applicable_combos !== undefined && {
          applicable_combos: updateCouponDto.applicable_combos,
        }),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Delete coupon (soft delete)
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    // Check if coupon exists
    const coupon = await this.prisma.coupons.findFirst({
      where: { id, deleted: false },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Soft delete
    await this.prisma.coupons.update({
      where: { id },
      data: {
        deleted: true,
        is_active: false,
        updated_at: new Date(),
      },
    });

    return { success: true, message: 'Coupon deleted successfully' };
  }

  /**
   * Validate if a coupon is valid for a user and courses
   */
  async validateCoupon(validateCouponDto: ValidateCouponDto, userId: string) {
    const { code, combo_ids, total_amount } = validateCouponDto;

    // Find coupon by code
    const coupon = await this.prisma.coupons.findFirst({
      where: {
        code: code,
        deleted: false,
        is_active: true,
      },
    });

    // Check if coupon exists
    if (!coupon) {
      return { isValid: false, errorMessage: 'Coupon not found' };
    }

    // Check if coupon is active
    if (!coupon.is_active) {
      return { isValid: false, errorMessage: 'Coupon is inactive' };
    }

    // Check date validity
    const now = new Date();
    if (now < coupon.valid_from) {
      return { isValid: false, errorMessage: 'Coupon is not yet valid' };
    }

    if (now > coupon.valid_until) {
      return { isValid: false, errorMessage: 'Coupon has expired' };
    }

    // Check usage limit
    if (
      coupon.usage_limit &&
      coupon.used_count &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return { isValid: false, errorMessage: 'Coupon usage limit reached' };
    }

    // Check if user already used this coupon
    const userUsage = await this.prisma.coupon_usage.findFirst({
      where: {
        coupon_id: coupon.id,
        user_id: userId,
        deleted: false,
      },
    });

    if (userUsage) {
      return {
        isValid: false,
        errorMessage: 'You have already used this coupon',
      };
    }

    // Check combo applicability
    if (coupon.applicable_combos && coupon.applicable_combos.length > 0) {
      // Check if any of the cart combos are applicable
      const hasApplicableCombo = combo_ids.some((comboId) =>
        coupon.applicable_combos.includes(comboId),
      );

      if (!hasApplicableCombo) {
        return {
          isValid: false,
          errorMessage: 'Coupon is not applicable to selected courses',
        };
      }
    }

    // Check minimum order amount if specified
    if (
      coupon.minimum_amount &&
      total_amount &&
      total_amount < Number(coupon.minimum_amount)
    ) {
      return {
        isValid: false,
        errorMessage: `Minimum order amount required: ${Number(coupon.minimum_amount).toString()}`,
      };
    }

    // Calculate potential discount (if total amount provided)
    let discount_amount = 0;
    if (total_amount) {
      if (coupon.discount_type === COUPONS_DISCOUNT_TYPE.PERCENTAGE) {
        discount_amount = (total_amount * Number(coupon.discount_value)) / 100;

        // Apply maximum discount if specified
        if (
          coupon.maximum_discount &&
          discount_amount > Number(coupon.maximum_discount)
        ) {
          discount_amount = Number(coupon.maximum_discount);
        }
      } else {
        // Fixed amount discount
        discount_amount = Number(coupon.discount_value);

        // Cap discount at total amount
        if (discount_amount > total_amount) {
          discount_amount = total_amount;
        }
      }
    }

    // Coupon is valid
    return {
      isValid: true,
      coupon,
      discount_amount,
    };
  }

  /**
   * Apply coupon to order
   */
  async applyCoupon(
    applyCouponDto: ApplyCouponDto,
    userId: string,
    orderId: string,
    totalAmount: number,
  ) {
    // Validate the coupon first
    const validationResult = await this.validateCoupon(
      {
        code: applyCouponDto.code,
        combo_ids: applyCouponDto.combo_ids,
        total_amount: totalAmount,
      },
      userId,
    );

    if (!validationResult.isValid) {
      throw new BadRequestException(validationResult.errorMessage);
    }

    const coupon = validationResult.coupon;
    const discount_amount = validationResult.discount_amount || 0;

    // Create coupon usage record
    await this.prisma.coupon_usage.create({
      data: {
        coupon_id: coupon?.id,
        user_id: userId,
        order_id: orderId,
        discount_amount,
        used_at: new Date(),
      },
    });

    // Increment coupon used count
    await this.prisma.coupons.update({
      where: { id: coupon?.id },
      data: {
        used_count: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return {
      discount_amount,
      coupon_id: coupon?.id,
    };
  }

  /**
   * Get available coupons for a user
   */
  async getAvailableCouponsForUser(userId: string, comboIds: string[]) {
    const now = new Date();

    // Get all active and valid coupons
    let coupons = await this.prisma.coupons.findMany({
      where: {
        deleted: false,
        is_active: true,
        valid_from: { lte: now },
        valid_until: { gte: now },
      },
    });

    coupons = coupons.filter(
      (coupon) =>
        !coupon.usage_limit ||
        (coupon.used_count &&
          coupon.usage_limit &&
          coupon.used_count < coupon.usage_limit),
    );

    // Filter out coupons the user has already used
    const usedCouponIds = (
      await this.prisma.coupon_usage.findMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        select: { coupon_id: true },
      })
    ).map((usage) => usage.coupon_id);

    // Filter by course applicability and usage
    const availableCoupons = coupons.filter((coupon) => {
      // Skip if user already used this coupon
      if (usedCouponIds.includes(coupon.id)) {
        return false;
      }

      // Check combo applicability
      if (coupon.applicable_combos && coupon.applicable_combos.length > 0) {
        // Check if any of the cart combos are applicable
        const hasApplicableCombo = comboIds.some((comboId) =>
          coupon.applicable_combos.includes(comboId),
        );

        if (!hasApplicableCombo) {
          return false;
        }
      }

      return true;
    });

    return availableCoupons;
  }

  /**
   * Get user's coupon usage history
   */
  async getUserCouponHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [usages, totalCount] = await Promise.all([
      this.prisma.coupon_usage.findMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        skip,
        take: limit,
        orderBy: { used_at: 'desc' },
        include: {
          coupons: {
            select: {
              code: true,
              name: true,
              discount_type: true,
              discount_value: true,
            },
          },
          orders: {
            select: {
              order_code: true,
              final_amount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.coupon_usage.count({
        where: {
          user_id: userId,
          deleted: false,
        },
      }),
    ]);

    // Format response
    const formattedUsages = usages.map((usage) => ({
      id: usage.id,
      coupon: {
        id: usage.coupon_id,
        code: usage.coupons?.code,
        name: usage.coupons?.name,
        discount_type: usage.coupons?.discount_type,
        discount_value: usage.coupons?.discount_value,
      },
      order: {
        id: usage.order_id,
        code: usage.orders?.order_code,
        amount: usage.orders?.final_amount,
        status: usage.orders?.status,
      },
      discount_amount: usage.discount_amount,
      used_at: usage.used_at,
    }));

    return {
      data: formattedUsages,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}
