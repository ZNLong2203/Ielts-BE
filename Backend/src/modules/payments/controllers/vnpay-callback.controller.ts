import { Controller, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from 'src/modules/payments/services/payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VnpayService } from '../services/vnpay.service';

@ApiTags('VNPay')
@Controller('payments/vnpay')
export class VnpayCallbackController {
  private readonly logger = new Logger(VnpayCallbackController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly vnpayService: VnpayService,
    private readonly prisma: PrismaService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  // @Get('callback')
  // @ApiOperation({ summary: 'Handle VNPay payment callback' })
  // @ApiQuery({ name: 'vnp_Amount', required: true })
  // @ApiQuery({ name: 'vnp_ResponseCode', required: true })
  // @ApiQuery({ name: 'vnp_SecureHash', required: true })
  // @Redirect()
  // async handleCallback(@Query() queryParams: any) {
  //   this.logger.log(`Received VNPay callback: ${JSON.stringify(queryParams)}`);

  //   try {
  //     const result = await this.paymentService.handleVnpayCallback(
  //       queryParams as VnpayResponse,
  //     );

  //     // Determine redirect URL
  //     if (result.success) {
  //       return {
  //         url: `${this.frontendUrl}/payment/success?orderId=${result.data?.orderId}&txnRef=${queryParams.vnp_TxnRef}`,
  //         statusCode: 302,
  //       };
  //     } else {
  //       return {
  //         url: `${this.frontendUrl}/payment/failure?message=${encodeURIComponent(result.message || 'Payment failed')}&code=${queryParams.vnp_ResponseCode}`,
  //         statusCode: 302,
  //       };
  //     }
  //   } catch (error) {
  //     this.logger.error(`Error handling VNPay callback: ${error.message}`);
  //     return {
  //       url: `${this.frontendUrl}/payment/failure?message=${encodeURIComponent('Internal server error')}`,
  //       statusCode: 302,
  //     };
  //   }
  // }

  // // For development/testing purposes
  // @Post('mock-callback')
  // @ApiOperation({
  //   summary: 'Simulate VNPay payment callback (for development)',
  // })
  // async mockCallback(@Body() mockData: { orderId: string; success: boolean }) {
  //   if (process.env.NODE_ENV === 'production') {
  //     throw new BadRequestException(
  //       'This endpoint is not available in production',
  //     );
  //   }

  //   // Check if orderId exists
  //   if (!mockData.orderId) {
  //     throw new BadRequestException('Order ID is required');
  //   }

  //   // Get order information
  //   const order = await this.prisma.orders.findUnique({
  //     where: { id: mockData.orderId },
  //   });

  //   if (!order) {
  //     throw new BadRequestException('Order not found');
  //   }

  //   // Generate mock callback data
  //   const amount = Math.round((order.final_amount || 0) * 100);
  //   const txnRef = `${order.id.substring(0, 8)}-${Date.now()}`;
  //   const vnpTmnCode = this.configService.get<string>('VNPAY_TERMINAL_ID');
  //   const vnpHashSecret = this.configService.get<string>('VNPAY_SECRET_KEY');

  //   const mockCallback: Record<string, any> = {
  //     vnp_Amount: amount.toString(),
  //     vnp_BankCode: 'NCB',
  //     vnp_CardType: 'ATM',
  //     vnp_OrderInfo: `Thanh toan don hang ${order.order_code}`,
  //     vnp_PayDate: new Date()
  //       .toISOString()
  //       .replace(/[-T:\.Z]/g, '')
  //       .substring(0, 14),
  //     vnp_ResponseCode: mockData.success ? '00' : '24',
  //     vnp_TmnCode: vnpTmnCode,
  //     vnp_TransactionNo: Date.now().toString(),
  //     vnp_TransactionStatus: mockData.success ? '00' : '01',
  //     vnp_TxnRef: txnRef,
  //   };

  //   // Create signature
  //   const sortedParams = this.vnpayService.sortObject(mockCallback);
  //   const signData = querystring.stringify(sortedParams, { encode: false });
  //   const hmac = crypto.createHmac('sha512', vnpHashSecret);
  //   mockCallback.vnp_SecureHash = hmac
  //     .update(Buffer.from(signData, 'utf-8'))
  //     .digest('hex');

  //   // Process the mock callback
  //   const result = await this.paymentService.handleVnpayCallback(
  //     mockCallback as VnpayResponse,
  //   );

  //   return {
  //     mockCallback,
  //     result,
  //   };
  // }
}
