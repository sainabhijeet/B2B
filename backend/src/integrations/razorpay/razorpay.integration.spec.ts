import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayIntegration } from './razorpay.integration';

describe('RazorpayIntegration', () => {
  const keyId = 'rzp_test_example';
  const keySecret = 'test_secret_value';
  let integration: RazorpayIntegration;

  beforeEach(() => {
    integration = new RazorpayIntegration(
      new ConfigService({
        razorpay: {
          keyId,
          keySecret,
          webhookSecret: 'webhook_secret_value',
        },
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies a valid checkout signature', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test123';
    const signature = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      integration.verifyPaymentSignature(orderId, paymentId, signature),
    ).toBe(true);
    expect(
      integration.verifyPaymentSignature(orderId, paymentId, '0'.repeat(64)),
    ).toBe(false);
  });

  it('maps captured payments returned for an order', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'pay_test123',
            order_id: 'order_test123',
            amount: 404880,
            currency: 'inr',
            status: 'CAPTURED',
          },
        ],
      }),
    } as Response);

    await expect(
      integration.fetchOrderPayments('order_test123'),
    ).resolves.toEqual({
      items: [
        {
          id: 'pay_test123',
          orderId: 'order_test123',
          amount: 404880,
          currency: 'INR',
          status: 'captured',
        },
      ],
    });
  });

  it('submits and validates a full order-payment refund', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'rfnd_test123',
        payment_id: 'pay_test123',
        amount: 404880,
        status: 'processed',
      }),
    } as Response);

    await expect(
      integration.refundPayment({
        paymentId: 'pay_test123',
        amountPaise: 404880,
        notes: { orderId: 'order_test123' },
      }),
    ).resolves.toEqual({
      id: 'rfnd_test123',
      paymentId: 'pay_test123',
      amount: 404880,
      status: 'processed',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/payments/pay_test123/refund',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
