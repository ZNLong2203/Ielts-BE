import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from 'src/modules/payments/services/payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Create a new payment' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Payment initiated successfully',
  //   type: PaymentResponseDto,
  // })
  // async createPayment(
  //   @Req() req: Request,
  //   @Body() createPaymentDto: CreatePaymentDto,
  // ): Promise<PaymentResponseDto> {
  //   return this.paymentService.createPayment(req.user.id, createPaymentDto);
  // }

  // @Get('order/:orderId')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Get all payments for an order' })
  // async getPaymentsByOrder(@Param('orderId') orderId: string) {
  //   return this.paymentService.getPaymentsByOrderId(orderId);
  // }

  // @Get(':paymentId')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Get payment details' })
  // async getPaymentDetails(@Param('paymentId') paymentId: string) {
  //   return this.paymentService.getPaymentDetails(paymentId);
  // }

  // @Post(':paymentId/refund')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Refund a payment' })
  // async refundPayment(
  //   @Param('paymentId') paymentId: string,
  //   @Body() refundData: { amount?: number },
  // ) {
  //   return this.paymentService.refundPayment(paymentId, refundData.amount);
  // }

  // @Get('test-cards')
  // @ApiOperation({ summary: 'Get test card information for development' })
  // getTestCards() {
  //   // Only return this information in development environment
  //   if (process.env.NODE_ENV === 'production') {
  //     return { message: 'Not available in production' };
  //   }

  //   return {
  //     stripe: {
  //       cards: [
  //         { type: 'Visa (Success)', number: '4242 4242 4242 4242' },
  //         { type: 'Visa (Decline)', number: '4000 0000 0000 0002' },
  //         {
  //           type: 'Visa (Requires Authentication)',
  //           number: '4000 0025 0000 3155',
  //         },
  //       ],
  //       expiry: 'Any future date (MM/YY)',
  //       cvc: 'Any 3 digits',
  //     },
  //     vnpay: {
  //       card: '9704198526191432198',
  //       cardholderName: 'NGUYEN VAN A',
  //       issueDate: '07/15',
  //       otp: '123456',
  //       note: 'Use NCB bank in the sandbox',
  //     },
  //   };
  // }
}
