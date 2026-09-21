import { OtpPurpose } from './otp-purpose';
import { OtpService } from './otp.service';

describe('OtpService development fixed login', () => {
  function createService() {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    const repository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'challenge-id' })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const values: Record<string, unknown> = {
      'otp.resendDelaySeconds': 30,
      'otp.dailySendLimitPerRecipient': 20,
      'otp.developmentEchoEnabled': true,
      'otp.developmentFixedLoginEnabled': true,
      'otp.developmentFixedPhone': '9999999999',
      'otp.developmentFixedCode': '000000',
    };
    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key in values ? values[key] : fallback,
      ),
    };
    const sms = {
      sendOtpSms: jest
        .fn()
        .mockResolvedValue({ channel: 'development' as const }),
    };
    const platformSettings = {
      getAuthSettings: jest.fn().mockResolvedValue({ otpExpiryMinutes: 5 }),
    };

    return {
      service: new OtpService(
        repository as never,
        config as never,
        sms as never,
        platformSettings as never,
      ),
      sms,
    };
  }

  it('returns 000000 only for the configured development phone', async () => {
    const { service, sms } = createService();

    await expect(
      service.requestOtpForRecipient({
        purpose: OtpPurpose.CUSTOMER_TENANT,
        tenantId: 'tenant-id',
        phone: '9999999999',
      }),
    ).resolves.toEqual({ expiresInMinutes: 5, developmentCode: '000000' });
    expect(sms.sendOtpSms).toHaveBeenCalledWith('9999999999', '000000');
  });

  it('keeps random OTP generation for every other phone', async () => {
    const { service, sms } = createService();

    const result = await service.requestOtpForRecipient({
      purpose: OtpPurpose.CUSTOMER_TENANT,
      tenantId: 'tenant-id',
      phone: '8888888888',
    });

    expect(result.developmentCode).toMatch(/^\d{6}$/);
    expect(result.developmentCode).not.toBe('000000');
    expect(sms.sendOtpSms).toHaveBeenCalledWith(
      '8888888888',
      result.developmentCode,
    );
  });
});
