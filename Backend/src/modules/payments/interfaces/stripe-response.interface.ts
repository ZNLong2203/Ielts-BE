export interface StripeResponse {
  id: string;
  object: string;
  amount: number;
  url?: string;
  status: string;
  client_secret?: string;
  payment_intent?: string;
}

export interface StripeWebhookEvent {
  id: string;
  object: string;
  api_version: string;
  data: {
    object: any;
  };
  type: string;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string;
    idempotency_key: string;
  };
}
