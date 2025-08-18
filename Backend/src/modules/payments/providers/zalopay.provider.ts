import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { order_items, orders } from '@prisma/client';
import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import {
  PaymentRecord,
  ZaloPayCallbackBody,
  ZaloPayCallbackData,
  ZaloPayCreateResult,
  ZaloPayPayload,
  ZaloPayResponse,
  ZaloPayTransactionQueryRes,
  ZaloPayVerificationResult,
} from 'src/modules/payments/interfaces/payment.interface';

@Injectable()
export class ZaloPayProvider {
  private readonly appId: number;
  private readonly key1: string;
  private readonly key2: string;
  private readonly endpoint: string;
  private readonly queryEndpoint: string;
  private readonly logger = new Logger(ZaloPayProvider.name);

  constructor(private readonly config: ConfigService) {
    this.appId = Number(this.config.get<string>('ZALOPAY_APP_ID'));
    this.key1 = this.config.get<string>('ZALOPAY_KEY1')!;
    this.key2 = this.config.get<string>('ZALOPAY_KEY2')!;
    this.endpoint = this.config.get<string>('ZALOPAY_CREATE_ENDPOINT')!;
    this.queryEndpoint = this.config.get<string>('ZALOPAY_QUERY_ENDPOINT')!;
  }

  private hmacSha256(data: string, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  buildPayload(
    appTransId: string,
    amount: number,
    order: orders | null,
    description: string,
    returnUrl?: string,
    redirectUrl?: string,
    orderItems?: order_items[],
  ): ZaloPayPayload {
    const embed = JSON.stringify({
      redirecturl: redirectUrl,
      preferred_payment_method: ['vietqr'],
    });
    let formatItems: {
      itemid: string;
      itemname: string | null;
      itemprice: number;
    }[] = [];
    if (orderItems) {
      formatItems = orderItems.map((item) => ({
        itemid: item.id,
        itemname: item.course_title,
        itemprice: Number(item.price),
      }));
    }
    const items = JSON.stringify(formatItems || []);
    const appUser = order?.user_id ? order.user_id.toString() : 'unknown';
    const appTime = Date.now();

    const raw = `${this.appId}|${appTransId}|${appUser}|${amount}|${appTime}|${embed}|${items}`;
    const mac = this.hmacSha256(raw, this.key1);

    const payload: ZaloPayPayload = {
      app_id: this.appId,
      app_trans_id: appTransId,
      app_user: appUser,
      amount,
      app_time: appTime,
      embed_data: embed,
      item: items,
      description,
      mac,
    };

    if (returnUrl) {
      payload.callback_url = returnUrl;
    }

    return payload;
  }

  async createOrder(
    amount: number,
    order: orders | null,
    description?: string,
    returnUrl?: string,
    redirectUrl?: string,
    orderItems?: order_items[],
  ): Promise<ZaloPayCreateResult> {
    const date = new Date();
    const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, ''); // 250814
    const appTransId = `${yymmdd}_${order?.id}`;

    const payload = this.buildPayload(
      appTransId,
      Math.round(amount),
      order,
      description || `Payment for order ${order?.id}`,
      returnUrl,
      redirectUrl,
      orderItems,
    );
    console.log('ZaloPay create order payload:', payload);

    const resp: AxiosResponse<ZaloPayResponse> = await axios.post(
      this.endpoint,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );
    console.log('ZaloPay create order response:', resp.data);

    // const resp: AxiosResponse<ZaloPayResponse> = await axios.post(
    //   this.endpoint,
    //   qs.stringify(payload),
    //   {
    //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //     // timeout: 15000,
    //   },
    // );

    if (resp.status !== 200) {
      this.logger.error(`ZaloPay create order failed: ${resp.statusText}`);
      throw new Error('ZaloPay create order failed');
    }

    return { respData: resp.data, appTransId };
  }

  verifyCallback(body: ZaloPayCallbackBody): ZaloPayVerificationResult {
    const { data, mac } = body;

    if (!data || !mac) {
      return { valid: false, reason: 'missing data or mac' };
    }

    const computed = this.hmacSha256(data, this.key2);

    if (computed !== mac) {
      return { valid: false, reason: 'invalid mac' };
    }

    try {
      const parsedData = JSON.parse(data) as ZaloPayCallbackData;
      return { valid: true, data: parsedData };
    } catch (error) {
      return { valid: false, reason: 'invalid data format' };
    }
  }

  async findPaymentStatusByAppTransId(
    app_trans_id: string,
  ): Promise<PaymentRecord | null> {
    const resp = await axios.post(
      this.queryEndpoint,
      {
        app_id: this.appId,
        app_trans_id,
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );

    const data = resp.data as ZaloPayTransactionQueryRes;

    if (data.return_code !== 1) {
      this.logger.warn(`ZaloPay query failed: ${data.return_message}`);
      return null;
    }

    return {
      id: data.zp_trans_id,
      order_id: null,
      transaction_id: data.zp_trans_id,
      gateway_response: data,
    };
  }
}
