export interface PaymentGateway {
  createPayment(data: any): Promise<any>;
  validateCallback(data: any): Promise<boolean>;
  processCallback(data: any): Promise<any>;
}
