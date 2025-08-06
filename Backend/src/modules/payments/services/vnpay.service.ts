import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
// implements PaymentGateway
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);
  private readonly vnpUrl: string;
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpReturnUrl: string;

  constructor(private readonly configService: ConfigService) {
    // this.vnpUrl = this.configService.get<string>('VNPAY_URL');
    // this.vnpTmnCode = this.configService.get<string>('VNPAY_TERMINAL_ID');
    // this.vnpHashSecret = this.configService.get<string>('VNPAY_SECRET_KEY');
    // this.vnpReturnUrl = this.configService.get<string>('VNPAY_RETURN_URL');
  }

  // async createPayment(data: {
  //   orderId: string;
  //   amount: number;
  //   currency: string;
  //   orderDescription?: string;
  //   returnUrl?: string;
  //   ipAddress?: string;
  // }): Promise<PaymentResponse> {
  //   try {
  //     this.logger.log(`Creating VNPay payment for order: ${data.orderId}`);

  //     const createDate = new Date();
  //     const formattedDate = this.formatDateForVnpay(createDate);

  //     // Generate a unique transaction reference
  //     const txnRef = `${data.orderId.substring(0, 8)}-${Date.now()}`;

  //     // Create parameters for VNPay
  //     const vnpParams = {
  //       vnp_Version: '2.1.0',
  //       vnp_Command: 'pay',
  //       vnp_TmnCode: this.vnpTmnCode,
  //       vnp_Locale: 'vn',
  //       vnp_CurrCode: data.currency || 'VND',
  //       vnp_TxnRef: txnRef,
  //       vnp_OrderInfo:
  //         data.orderDescription || `Thanh toan cho don hang ${data.orderId}`,
  //       vnp_OrderType: 'billpayment',
  //       vnp_Amount: Math.round(data.amount * 100), // VNPay requires amount * 100
  //       vnp_ReturnUrl: data.returnUrl || this.vnpReturnUrl,
  //       vnp_IpAddr: data.ipAddress || '127.0.0.1',
  //       vnp_CreateDate: formattedDate,
  //     };

  //     // Sort parameters alphabetically
  //     const sortedParams = this.sortObject(vnpParams);

  //     // Create signature
  //     const signData = querystring.stringify(sortedParams, { encode: false });
  //     const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
  //     const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  //     // Add signature to parameters
  //     vnpParams['vnp_SecureHash'] = signed;

  //     // Generate payment URL
  //     const vnpUrl = `${this.vnpUrl}?${querystring.stringify(vnpParams, { encode: true })}`;

  //     this.logger.log(`VNPay payment URL created for order: ${data.orderId}`);

  //     return {
  //       success: true,
  //       redirectUrl: vnpUrl,
  //       transactionId: txnRef,
  //       data: vnpParams,
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `Error creating VNPay payment: ${error.message}`,
  //       error.stack,
  //     );
  //     return {
  //       success: false,
  //       message: `Payment creation failed: ${error.message}`,
  //     };
  //   }
  // }

  // async validateCallback(data: VnpayResponse): Promise<boolean> {
  //   try {
  //     // Extract secure hash from callback data
  //     const secureHash = data.vnp_SecureHash;

  //     // Create a copy of data for verification
  //     const vnpData = { ...data };
  //     delete vnpData.vnp_SecureHash;

  //     // Sort parameters alphabetically
  //     const sortedParams = this.sortObject(vnpData);

  //     // Create string for hashing
  //     const signData = querystring.stringify(sortedParams, { encode: false });

  //     // Create signature to compare
  //     const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
  //     const calculatedHash = hmac
  //       .update(Buffer.from(signData, 'utf-8'))
  //       .digest('hex');

  //     // Compare calculated signature with received signature
  //     return calculatedHash === secureHash;
  //   } catch (error) {
  //     this.logger.error(
  //       `VNPay callback validation error: ${error.message}`,
  //       error.stack,
  //     );
  //     return false;
  //   }
  // }

  // async processCallback(data: VnpayResponse): Promise<PaymentResponse> {
  //   this.logger.log(
  //     `Processing VNPay callback for transaction: ${data.vnp_TxnRef}`,
  //   );

  //   // Check response code from VNPay
  //   if (data.vnp_ResponseCode === VnpayResponseCode.SUCCESS) {
  //     // Extract orderId from vnp_TxnRef
  //     const txnRef = data.vnp_TxnRef;
  //     const orderId = txnRef.split('-')[0]; // Assuming orderId is first part of txnRef

  //     return {
  //       success: true,
  //       transactionId: data.vnp_TransactionNo,
  //       data: {
  //         orderId,
  //         paymentStatus: PaymentStatus.COMPLETED,
  //         paymentMethod: 'vnpay',
  //         amount: parseInt(data.vnp_Amount) / 100, // Convert back to actual amount
  //         bankCode: data.vnp_BankCode,
  //         bankTranNo: data.vnp_BankTranNo,
  //         cardType: data.vnp_CardType,
  //         gatewayResponse: data,
  //       },
  //     };
  //   } else {
  //     // Handle error cases
  //     let failureMessage = 'Payment failed';
  //     let paymentStatus = PaymentStatus.FAILED;

  //     switch (data.vnp_ResponseCode) {
  //       case VnpayResponseCode.ORDER_NOT_FOUND:
  //         failureMessage = 'Order not found';
  //         break;
  //       case VnpayResponseCode.INVALID_AMOUNT:
  //         failureMessage = 'Invalid payment amount';
  //         break;
  //       case VnpayResponseCode.ALREADY_CONFIRMED:
  //         failureMessage = 'Transaction was already confirmed';
  //         break;
  //       case VnpayResponseCode.INVALID_SIGNATURE:
  //         failureMessage = 'Invalid signature';
  //         break;
  //       case VnpayResponseCode.CUSTOMER_CANCELED:
  //         failureMessage = 'Customer canceled the payment';
  //         paymentStatus = PaymentStatus.CANCELLED;
  //         break;
  //       case VnpayResponseCode.BANK_DECLINED:
  //         failureMessage = 'Bank declined the transaction';
  //         break;
  //       case VnpayResponseCode.INSUFFICIENT_FUNDS:
  //         failureMessage = 'Insufficient funds';
  //         break;
  //       case VnpayResponseCode.SYSTEM_ERROR:
  //         failureMessage = 'System error';
  //         break;
  //       case VnpayResponseCode.INVALID_CARD_INFO:
  //         failureMessage = 'Invalid card information';
  //         break;
  //       default:
  //         failureMessage = `Payment failed with code: ${data.vnp_ResponseCode}`;
  //     }

  //     // Extract orderId from txnRef
  //     const txnRef = data.vnp_TxnRef;
  //     const orderId = txnRef ? txnRef.split('-')[0] : null;

  //     return {
  //       success: false,
  //       message: failureMessage,
  //       transactionId: data.vnp_TransactionNo,
  //       data: {
  //         orderId,
  //         responseCode: data.vnp_ResponseCode,
  //         gatewayResponse: data,
  //         paymentStatus,
  //       },
  //     };
  //   }
  // }

  // // Format date string as yyyyMMddHHmmss for VNPay
  // private formatDateForVnpay(date: Date): string {
  //   const pad = (num: number) => (num < 10 ? '0' + num : num);

  //   const year = date.getFullYear();
  //   const month = pad(date.getMonth() + 1);
  //   const day = pad(date.getDate());
  //   const hour = pad(date.getHours());
  //   const minute = pad(date.getMinutes());
  //   const second = pad(date.getSeconds());

  //   return `${year}${month}${day}${hour}${minute}${second}`;
  // }

  // // Sort object by key alphabetically
  // sortObject(obj: any): Record<string, any> {
  //   const sorted: Record<string, any> = {};
  //   const keys = Object.keys(obj).sort();

  //   for (const key of keys) {
  //     if (obj[key] !== null && obj[key] !== undefined) {
  //       sorted[key] = obj[key];
  //     }
  //   }

  //   return sorted;
  // }
}
