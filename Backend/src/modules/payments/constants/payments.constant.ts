export enum PaymentMethod {
  STRIPE = 'stripe',
  ZALOPAY = 'zalopay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}
