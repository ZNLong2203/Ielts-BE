export interface ZaloPayPayload {
  app_id: number;
  app_trans_id: string;
  app_user: string;
  amount: number;
  app_time: number;
  embed_data: string;
  item: string;
  description: string;
  mac: string;
  call_back_url?: string;
}

export interface ZaloPayCallbackData {
  app_id: number;
  app_trans_id: string;
  app_time: number;
  app_user: string;
  amount: number;
  embed_data: string;
  item: string;
  zp_trans_id: number;
  server_time: number;
  channel: number;
  merchant_user_id: string;
  user_fee_amount: number;
  discount_amount: number;
}

export interface ZaloPayResponse {
  return_code: number;
  return_message: string;
  order_url?: string;
  zp_trans_token?: string;
}

export interface ZaloPayCreateResult {
  respData: ZaloPayResponse;
  appTransId: string;
}

export interface ZaloPayCallbackBody {
  data: string;
  mac: string;
}

export interface ZaloPayVerificationResult {
  valid: boolean;
  reason?: string;
  data?: ZaloPayCallbackData;
}

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
