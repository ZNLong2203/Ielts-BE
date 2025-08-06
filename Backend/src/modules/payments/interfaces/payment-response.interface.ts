export interface PaymentResponse {
  success: boolean;
  redirectUrl?: string | null;
  transactionId?: string;
  message?: string;
  data?: any;
}
