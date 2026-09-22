import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpPurpose } from '../otp/otp-purpose';
import { UserRole } from '../../common/enums/user-role.enum';

describe('storefront OTP login', () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const phone = '8899665544';

  function setup(owner: object | null) {
    const usersService = {
      findTenantOwnerByMobile: jest.fn().mockResolvedValue(owner),
      findTenantCustomerUserByPhone: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'customer-user', role: UserRole.CUSTOMER, tenantId }),
      markPhoneVerified: jest.fn().mockResolvedValue(undefined),
    };
    const customersService = {
      assertOwnerCustomerEligible: jest.fn().mockResolvedValue(undefined),
      requireActiveByTenantAndMobile: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      ensureVerifiedOwnerCustomer: jest.fn().mockResolvedValue({ id: 'owner-customer' }),
      ensureDevTestCustomer: jest.fn(),
    };
    const otpService = {
      requestOtpForRecipient: jest.fn().mockResolvedValue({ expiresInMinutes: 5 }),
      verifyOtpForRecipient: jest.fn().mockResolvedValue({ ok: true }),
    };
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, {
      usersService,
      customersService,
      otpService,
      configService: {
        get: jest.fn((key: string) => key === 'otp.fixedCodeEnabled' ? false : undefined),
      },
      auditLogsService: { log: jest.fn().mockResolvedValue(undefined) },
      issueTokens: jest.fn().mockResolvedValue({ accessToken: 'token' }),
    });
    return { service, usersService, customersService, otpService };
  }

  it('allows the owner of this tenant to request OTP without creating a customer', async () => {
    const { service, usersService, customersService, otpService } = setup({ id: 'owner-1' });

    await service.storefrontCustomerRequestLoginOtp(tenantId, phone);

    expect(usersService.findTenantOwnerByMobile).toHaveBeenCalledWith(tenantId, phone);
    expect(customersService.assertOwnerCustomerEligible).toHaveBeenCalledWith(tenantId, phone);
    expect(customersService.ensureVerifiedOwnerCustomer).not.toHaveBeenCalled();
    expect(otpService.requestOtpForRecipient).toHaveBeenCalledWith({
      purpose: OtpPurpose.CUSTOMER_TENANT,
      tenantId,
      phone,
    });
  });

  it('does not send OTP for an unregistered non-owner', async () => {
    const { service, customersService, otpService } = setup(null);
    customersService.requireActiveByTenantAndMobile.mockRejectedValueOnce(
      new NotFoundException('No retailer account for this mobile at this store.'),
    );

    await expect(service.storefrontCustomerRequestLoginOtp(tenantId, phone)).rejects.toThrow(NotFoundException);
    expect(otpService.requestOtpForRecipient).not.toHaveBeenCalled();
  });

  it('does not send OTP for an owner whose buyer profile was disabled', async () => {
    const { service, customersService, otpService } = setup({ id: 'owner-1' });
    customersService.assertOwnerCustomerEligible.mockRejectedValueOnce(
      new ForbiddenException('This retailer account is not active.'),
    );

    await expect(service.storefrontCustomerRequestLoginOtp(tenantId, phone)).rejects.toThrow(ForbiddenException);
    expect(otpService.requestOtpForRecipient).not.toHaveBeenCalled();
  });

  it('creates the owner buyer profile only after OTP verification', async () => {
    const { service, usersService, customersService, otpService } = setup({ id: 'owner-1' });

    await service.storefrontCustomerVerifyOtpAndLogin(tenantId, phone, '123456', 'web-device');

    expect(otpService.verifyOtpForRecipient).toHaveBeenCalledWith(
      { purpose: OtpPurpose.CUSTOMER_TENANT, tenantId, phone },
      '123456',
    );
    expect(customersService.ensureVerifiedOwnerCustomer).toHaveBeenCalledWith(tenantId, phone);
    expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
      phone,
      role: UserRole.CUSTOMER,
      customerId: 'owner-customer',
    }));
  });
});
