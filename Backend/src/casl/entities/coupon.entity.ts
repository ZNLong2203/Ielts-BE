export class Coupon {
  constructor(init?: Partial<Coupon>) {
    Object.assign(this, init);
  }

  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  usage_limit?: number;
  used_count?: number;
  valid_from?: Date;
  valid_until?: Date;
  is_active?: boolean;
  applicable_courses?: string[];
  created_by?: string;
}
