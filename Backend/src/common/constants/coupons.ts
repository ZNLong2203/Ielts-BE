export const COUPONS_DISCOUNT_TYPE = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
};

export type CouponsDiscountType =
  (typeof COUPONS_DISCOUNT_TYPE)[keyof typeof COUPONS_DISCOUNT_TYPE];
