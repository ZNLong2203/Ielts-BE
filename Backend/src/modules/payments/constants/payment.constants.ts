export enum PaymentMethod {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  VNPAY = 'vnpay',
  MOMO = 'momo',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  VNPAY = 'vnpay',
  MOMO = 'momo',
  PAYPAL = 'paypal',
}
