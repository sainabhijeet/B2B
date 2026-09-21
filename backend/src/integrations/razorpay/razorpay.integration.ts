import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Shared Razorpay client for SaaS billing and authenticated storefront orders. */
export type RazorpayCreateOrderResult = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

export type RazorpayPaymentResult = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
};

export type RazorpayOrderPaymentsResult = {
  items: RazorpayPaymentResult[];
};

export type RazorpayRefundResult = {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
};

@Injectable()
export class RazorpayIntegration {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const keyId = this.config.get<string>('razorpay.keyId', '');
    const keySecret = this.config.get<string>('razorpay.keySecret', '');
    return Boolean(keyId && keySecret);
  }

  getPublicKeyId(): string {
    return this.config.get<string>('razorpay.keyId', '');
  }

  /** Webhook HMAC over raw POST body (Razorpay `X-Razorpay-Signature`). */
  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): boolean {
    const webhookSecret = this.config.get<string>('razorpay.webhookSecret', '');
    if (!webhookSecret || !signature) return false;
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string,
  ): boolean {
    const keySecret = this.config.get<string>('razorpay.keySecret', '');
    if (!keySecret) return false;
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = createHmac('sha256', keySecret).update(body).digest('hex');
    try {
      return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  async createOrder(params: {
    amountPaise: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayCreateOrderResult> {
    const keyId = this.config.get<string>('razorpay.keyId', '');
    const keySecret = this.config.get<string>('razorpay.keySecret', '');
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        currency: params.currency,
        receipt: params.receipt.slice(0, 40),
        notes: params.notes ?? {},
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const desc =
        typeof data.error === 'object' &&
        data.error &&
        'description' in data.error
          ? String((data.error as { description?: string }).description)
          : JSON.stringify(data);
      throw new Error(`Razorpay order failed: ${desc}`);
    }
    return {
      id: String(data.id),
      amount: Number(data.amount),
      currency: String(data.currency),
      status: String(data.status),
    };
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPaymentResult> {
    const keyId = this.config.get<string>('razorpay.keyId', '');
    const keySecret = this.config.get<string>('razorpay.keySecret', '');
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const desc =
        typeof data.error === 'object' &&
        data.error &&
        'description' in data.error
          ? String((data.error as { description?: string }).description)
          : 'Razorpay payment lookup failed.';
      throw new Error(desc);
    }
    return {
      id: String(data.id),
      orderId: String(data.order_id),
      amount: Number(data.amount),
      currency: String(data.currency).toUpperCase(),
      status: String(data.status).toLowerCase(),
    };
  }

  async fetchOrderPayments(
    orderId: string,
  ): Promise<RazorpayOrderPaymentsResult> {
    const keyId = this.config.get<string>('razorpay.keyId', '');
    const keySecret = this.config.get<string>('razorpay.keySecret', '');
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const desc =
        typeof data.error === 'object' &&
        data.error &&
        'description' in data.error
          ? String((data.error as { description?: string }).description)
          : 'Unable to fetch Razorpay order payments.';
      throw new Error(desc);
    }
    const rows = Array.isArray(data.items) ? data.items : [];
    return {
      items: rows
        .filter((row): row is Record<string, unknown> =>
          Boolean(row && typeof row === 'object'),
        )
        .map((row) => ({
          id: String(row.id),
          orderId: String(row.order_id),
          amount: Number(row.amount),
          currency: String(row.currency).toUpperCase(),
          status: String(row.status).toLowerCase(),
        })),
    };
  }

  async refundPayment(params: {
    paymentId: string;
    amountPaise: number;
    notes?: Record<string, string>;
  }): Promise<RazorpayRefundResult> {
    const keyId = this.config.get<string>('razorpay.keyId', '');
    const keySecret = this.config.get<string>('razorpay.keySecret', '');
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amountPaise,
          speed: 'normal',
          notes: params.notes ?? {},
        }),
      },
    );
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const desc =
        typeof data.error === 'object' && data.error && 'description' in data.error
          ? String((data.error as { description?: string }).description)
          : 'Razorpay refund failed.';
      throw new Error(desc);
    }
    return {
      id: String(data.id),
      paymentId: String(data.payment_id),
      amount: Number(data.amount),
      status: String(data.status).toLowerCase(),
    };
  }
}
