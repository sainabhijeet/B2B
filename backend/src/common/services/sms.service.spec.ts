import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { PlatformSettingsService } from '../../modules/system-config/platform-settings.service';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  const platformSettings = {
    getSmsProvidersStored: jest.fn(),
  } as unknown as PlatformSettingsService;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns the random OTP only through the explicitly enabled development channel', async () => {
    const config = {
      get: jest.fn().mockReturnValue(true),
    } as unknown as ConfigService;
    const service = new SmsService(platformSettings, config);

    await expect(service.sendOtpSms('918899665544', '123456')).resolves.toEqual({
      channel: 'development',
    });
    expect(platformSettings.getSmsProvidersStored).not.toHaveBeenCalled();
  });

  it('sends a server-generated OTP through the configured MSG91 template', async () => {
    const config = {
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService;
    (platformSettings.getSmsProvidersStored as jest.Mock).mockResolvedValue([
      {
        id: 'msg91-primary',
        provider: 'MSG91',
        apiKey: 'secret-auth-key',
        senderId: 'SHOPZG',
        route: 'approved-template-id',
        status: 'active',
      },
    ]);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ type: 'success', message: 'OTP sent successfully.' }),
    } as Response);
    const service = new SmsService(platformSettings, config);

    await expect(service.sendOtpSms('918899665544', '654321')).resolves.toEqual({
      channel: 'sms',
    });
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://control.msg91.com/api/v5/otp');
    expect(requestUrl.searchParams.get('mobile')).toBe('918899665544');
    expect(requestUrl.searchParams.get('otp')).toBe('654321');
    expect(requestUrl.searchParams.get('template_id')).toBe('approved-template-id');
  });

  it('fails closed when no production MSG91 delivery is configured', async () => {
    const config = {
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService;
    (platformSettings.getSmsProvidersStored as jest.Mock).mockResolvedValue([]);
    const service = new SmsService(platformSettings, config);

    await expect(service.sendOtpSms('918899665544', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
