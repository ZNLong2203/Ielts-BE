export interface PaymentRecord {
  id: string;
  order_id: string | null;
  transaction_id: string | null;
  gateway_response: unknown;
}

export interface PaymentForProcessing {
  id: string;
  order_id: string;
}
