import { Request } from 'express';
import { Coupon } from 'src/casl/entities';
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Action } from '../enums/action.enum';

/**
 * Check if user can create coupon (admin only)
 */
export const canCreateCoupon: PolicyHandlerCallback = async (
  ability: AppAbility,
): Promise<boolean> => {
  return ability.can(Action.Create, Coupon);
};

/**
 * Check if user can update coupon
 * No database access - uses body.created_by or assumes admin permission
 */
export const canUpdateCoupon: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const couponId = request.params.id;

  // Nếu không có ID được cung cấp, kiểm tra quyền chung
  if (!couponId) {
    return ability.can(Action.Update, Coupon);
  }

  // Lấy created_by từ request body nếu được cung cấp
  const createdBy = request.body?.created_by;

  // Tạo coupon subject để kiểm tra quyền
  const couponSubject = new Coupon({
    id: couponId,
    created_by: createdBy,
  });

  // Kiểm tra xem người dùng có thể cập nhật coupon này không
  return ability.can(Action.Update, couponSubject);
};

/**
 * Check if user can delete coupon
 */
export const canDeleteCoupon: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const couponId = request.params.id;

  if (!couponId) {
    return ability.can(Action.Delete, Coupon);
  }

  const createdBy = request.body?.created_by;

  const couponSubject = new Coupon({
    id: couponId,
    created_by: createdBy,
  });

  return ability.can(Action.Delete, couponSubject);
};

/**
 * Check if user can apply coupon
 */
export const canApplyCoupon: PolicyHandlerCallback = async (
  ability: AppAbility,
): Promise<boolean> => {
  // Tất cả người dùng đã xác thực có thể áp dụng coupon
  return ability.can(Action.Read, 'all');
};
