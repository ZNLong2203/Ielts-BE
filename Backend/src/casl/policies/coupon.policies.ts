import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { Coupon } from 'src/casl/entities';
import { AppAbility, PolicyHandlerCallback } from 'src/types/ability.types';
import { Action } from '../enums/action.enum';
import { getService } from './base.policies';

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
 */
export const canUpdateCoupon: PolicyHandlerCallback = async (
  ability: AppAbility,
  request: Request,
): Promise<boolean> => {
  const couponId = request.params.id;

  // If no ID provided, check generic permission
  if (!couponId) {
    return ability.can(Action.Update, Coupon);
  }

  // Get coupon from database
  const couponsService = getService(request, 'couponsService');
  const coupon = await couponsService.findOne(couponId);

  if (!coupon) {
    throw new NotFoundException('Coupon not found');
  }

  // Create coupon subject for permission check
  const couponSubject = new Coupon({
    id: coupon.id,
    created_by: coupon.created_by?.id || undefined,
  });

  // Check if user can update this coupon
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

  const couponsService = getService(request, 'couponsService');
  const coupon = await couponsService.findOne(couponId);

  if (!coupon) {
    throw new NotFoundException('Coupon not found');
  }

  const couponSubject = new Coupon({
    id: coupon.id,
    created_by: coupon.created_by?.id || undefined,
  });

  return ability.can(Action.Delete, couponSubject);
};

/**
 * Check if user can apply coupon
 */
export const canApplyCoupon: PolicyHandlerCallback = async (
  ability: AppAbility,
): Promise<boolean> => {
  // All authenticated users can apply coupons
  return ability.can(Action.Read, 'all');
};
