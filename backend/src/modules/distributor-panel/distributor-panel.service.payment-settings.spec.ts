import { BadRequestException } from '@nestjs/common';
import { DistributorPanelService } from './distributor-panel.service';
import { TenantPaymentSettings } from '../../common/entities/tenant-payment-settings.entity';

const createService = (initial?: TenantPaymentSettings | null) => {
  let row = initial ?? null;
  const repo = {
    findOne: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
      row?.tenantId === where.tenantId ? row : null,
    ),
    create: jest.fn((input: Partial<TenantPaymentSettings>) =>
      Object.assign(new TenantPaymentSettings(), input),
    ),
    save: jest.fn(async (next: TenantPaymentSettings) => {
      row = next;
      return row;
    }),
  };
  const credentials = {
    encrypt: jest.fn((value: string) => `enc:${value}`),
    decrypt: jest.fn((value: string) => value.replace(/^enc:/, '')),
    mask: jest.fn((value: string) => `����${value.slice(-4)}`),
  };
  const service = new DistributorPanelService(
    {} as never,
    {} as never,
    {} as never,
    credentials as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    repo as never,
  );
  return {
    service,
    repo,
    credentials,
    get row() {
      return row;
    },
  };
};

describe('DistributorPanelService payment settings', () => {
  it('returns empty safe defaults when a tenant has no payment settings', async () => {
    const { service } = createService();

    await expect(service.getPaymentSettings('tenant-1')).resolves.toEqual({
      success: true,
      data: {
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        accountNumberMasked: '',
        ifsc: '',
        branch: '',
        upiId: '',
      },
      meta: {},
      message: '',
    });
  });

  it('creates tenant-scoped settings with encrypted account number and masked response', async () => {
    const ctx = createService();
    const { service, repo, credentials } = ctx;

    const result = await service.patchPaymentSettings('tenant-1', 'user-1', {
      accountHolderName: '  Retailer One  ',
      bankName: '  Test Bank ',
      accountNumber: ' 1234 5678 9012 ',
      ifsc: ' hdfc0001234 ',
      branch: ' Main ',
      upiId: ' Retailer@OneBank ',
    });

    expect(repo.create).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    expect(credentials.encrypt).toHaveBeenCalledWith('123456789012');
    expect(ctx.row?.tenantId).toBe('tenant-1');
    expect(ctx.row?.updatedBy).toBe('user-1');
    expect(ctx.row?.accountNumberEncrypted).toBe('enc:123456789012');
    expect(ctx.row?.accountNumberLast4).toBe('9012');
    expect(result.data).toEqual({
      accountHolderName: 'Retailer One',
      bankName: 'Test Bank',
      accountNumber: '123456789012',
      accountNumberMasked: '����9012',
      ifsc: 'HDFC0001234',
      branch: 'Main',
      upiId: 'retailer@onebank',
    });
  });

  it('updates only provided fields and preserves existing encrypted account number', async () => {
    const existing = Object.assign(new TenantPaymentSettings(), {
      tenantId: 'tenant-1',
      accountHolderName: 'Old Name',
      bankName: 'Old Bank',
      accountNumberEncrypted: 'enc:111122223333',
      accountNumberLast4: '3333',
      ifsc: 'ICIC0000001',
      branch: 'Old Branch',
      upiId: 'old@bank',
    });
    const ctx = createService(existing);
    const { service, credentials } = ctx;

    const result = await service.patchPaymentSettings('tenant-1', 'user-2', {
      bankName: 'New Bank',
    });

    expect(credentials.encrypt).not.toHaveBeenCalled();
    expect(ctx.row?.accountNumberEncrypted).toBe('enc:111122223333');
    expect(ctx.row?.bankName).toBe('New Bank');
    expect(ctx.row?.updatedBy).toBe('user-2');
    expect(result.data.accountNumber).toBe('111122223333');
    expect(result.data.accountNumberMasked).toBe('����3333');
  });

  it('rejects invalid account numbers, IFSC values, and UPI IDs', async () => {
    const { service } = createService();

    await expect(
      service.patchPaymentSettings('tenant-1', 'user-1', {
        accountNumber: '12',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.patchPaymentSettings('tenant-1', 'user-1', { ifsc: 'BAD' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.patchPaymentSettings('tenant-1', 'user-1', { upiId: 'bad-upi' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
