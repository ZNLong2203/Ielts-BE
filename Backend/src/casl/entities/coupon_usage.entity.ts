export class CouponUsage {
  constructor(init?: Partial<CouponUsage>) {
    Object.assign(this, init);
  }

  id: string;
  coupon_id: string;
  user_id: string;
  order_id: string;
  discount_amount: number;
  used_at?: Date;
}
