import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { CustomersService } from './customers.service';

const customer = {
  id: 'customer-1',
  tenantId: 'tenant-1',
  name: 'Old Name',
  mobile: '9999999999',
  email: 'old@example.test',
  creditLimit: '100.00',
  creditBalance: '10.00',
  avatarStorageObjectId: null,
  businessLegalName: null,
  gstin: null,
  gstVerified: false,
  gstStatus: null,
  gstVerifiedAt: null,
  gstCertificateStorageObjectId: null,
  gstCertificateFileName: null,
  deletedAt: null,
};

const actor = {
  sub: 'user-1',
  role: UserRole.CUSTOMER,
  tenantId: 'tenant-1',
  customerId: 'customer-1',
};

function makeService() {
  const customersRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (row) => row),
  };
  const txRepo = {
    update: jest.fn(),
    save: jest.fn(async (row) => row),
    create: jest.fn((row) => row),
    findOneOrFail: jest.fn(),
  };
  const addressesRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => row),
    update: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(async (cb) => cb({ getRepository: () => txRepo })),
    },
  };
  const storageObjectRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (row) => row),
    update: jest.fn(),
  };
  const storageRuntime = {
    resolveProvider: jest.fn(async () => ({
      metadata: { providerId: null, source: 'local' },
      adapter: { put: jest.fn(), delete: jest.fn() },
    })),
  };
  const storageObjects = {
    registerTenantObjectForTenant: jest.fn(async () => ({
      id: 'storage-avatar-1',
      url: '/api/v1/storage-objects/storage-avatar-1/content?token=signed',
    })),
  };
  const storageDelivery = {
    createSignedReadAccess: jest.fn(async (id: string) => ({
      url: `/api/v1/storage-objects/${id}/content?token=signed`,
    })),
  };
  const uploadValidation = {
    validateFileOrThrow: jest.fn(({ objectKey }) => ({
      filename: 'avatar.png',
      extension: '.png',
      detectedMimeType: 'image/png',
      sizeBytes: 8,
      objectKey: objectKey ?? null,
    })),
  };
  const service = new CustomersService(
    {} as never,
    customersRepo as never,
    addressesRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      sign: jest.fn((value) => value),
      store: jest.fn(),
      delete: jest.fn(),
    } as never,
    { createForTenantStaff: jest.fn() } as never,
    storageObjectRepo as never,
    storageRuntime as never,
    storageObjects as never,
    storageDelivery as never,
    uploadValidation as never,
  );
  return {
    service,
    customersRepo,
    addressesRepo,
    txRepo,
    storageObjectRepo,
    storageRuntime,
    storageObjects,
    storageDelivery,
    uploadValidation,
  };
}

describe('CustomersService storefront customer settings', () => {
  it('updates only the authenticated customer profile name/email', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.find.mockResolvedValue([]);

    const result = await service.updateStorefrontCustomerProfile(actor, {
      name: 'New Name',
      email: 'new@example.test',
    });

    expect(customersRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        tenantId: 'tenant-1',
        deletedAt: expect.anything(),
      },
    });
    expect(customersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'customer-1',
        name: 'New Name',
        email: 'new@example.test',
      }),
    );
    expect(result.data.id).toBe('customer-1');
  });

  it('rejects non-customer sessions for profile update', async () => {
    const { service } = makeService();
    await expect(
      service.updateStorefrontCustomerProfile(
        { ...actor, role: UserRole.OWNER, customerId: undefined },
        { name: 'Bad' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists only the authenticated customer addresses', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.find.mockResolvedValue([
      { id: 'addr-1', customerId: 'customer-1', line1: 'A', isDefault: true },
    ]);

    const result = await service.listAddressesForStorefrontCustomer(actor);

    expect(addressesRepo.find).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    expect(result.data).toHaveLength(1);
  });

  it('creates the first authenticated customer address as default', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.count.mockResolvedValue(0);

    await service.addAddressForStorefrontCustomer(actor, {
      line1: 'Line 1',
      city: 'City',
      state: 'State',
      pincode: '123456',
    });

    expect(addressesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', isDefault: true }),
    );
  });

  it('updates only an address owned by the authenticated customer', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.findOne.mockResolvedValue({
      id: 'addr-1',
      customerId: 'customer-1',
      isDefault: false,
    });

    await service.updateAddressForStorefrontCustomer(actor, 'addr-1', {
      label: 'Shop',
      line1: 'Line 1',
      city: 'City',
      state: 'State',
      pincode: '123456',
      isDefault: true,
    });

    expect(addressesRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'addr-1', customerId: 'customer-1' },
    });
    expect(addressesRepo.update).toHaveBeenCalledWith(
      { customerId: 'customer-1' },
      { isDefault: false },
    );
    expect(addressesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'addr-1', isDefault: true }),
    );
  });

  it('rejects updating another customer address', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateAddressForStorefrontCustomer(actor, 'other-address', {
        line1: 'Line 1',
        city: 'City',
        state: 'State',
        pincode: '123456',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sets default address only within the authenticated customer addresses', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.findOne.mockResolvedValue({
      id: 'addr-2',
      customerId: 'customer-1',
      isDefault: false,
    });
    await service.setDefaultAddressForStorefrontCustomer(actor, 'addr-2');

    expect(addressesRepo.update).toHaveBeenCalledWith(
      { customerId: 'customer-1' },
      { isDefault: false },
    );
    expect(addressesRepo.update).toHaveBeenCalledWith(
      { id: 'addr-2' },
      { isDefault: true },
    );
  });

  it('deletes only an address owned by the authenticated customer', async () => {
    const { service, customersRepo, addressesRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.findOne
      .mockResolvedValueOnce({
        id: 'addr-1',
        customerId: 'customer-1',
        isDefault: false,
      })
      .mockResolvedValueOnce(null);

    const result = await service.deleteAddressForStorefrontCustomer(
      actor,
      'addr-1',
    );

    expect(addressesRepo.delete).toHaveBeenCalledWith({
      id: 'addr-1',
      customerId: 'customer-1',
    });
    expect(result.data.deleted).toBe(true);
  });

  it('rejects cross-tenant customer sessions', async () => {
    const { service, customersRepo } = makeService();
    customersRepo.findOne.mockResolvedValue(null);

    await expect(
      service.listAddressesForStorefrontCustomer({
        ...actor,
        tenantId: 'tenant-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('keeps customer profile working without an avatar', async () => {
    const { service, customersRepo, addressesRepo, storageDelivery } =
      makeService();
    customersRepo.findOne.mockResolvedValue({
      ...customer,
      avatarStorageObjectId: null,
    });
    addressesRepo.find.mockResolvedValue([]);

    const result = await service.profileForStorefrontCustomer(actor);

    expect(result.data.profileImageUrl).toBeNull();
    expect(storageDelivery.createSignedReadAccess).not.toHaveBeenCalled();
  });

  it('returns a signed avatar URL for the authenticated customer profile', async () => {
    const { service, customersRepo, addressesRepo, storageDelivery } =
      makeService();
    customersRepo.findOne.mockResolvedValue({
      ...customer,
      avatarStorageObjectId: 'storage-avatar-1',
    });
    addressesRepo.find.mockResolvedValue([]);

    const result = await service.profileForStorefrontCustomer(actor);

    expect(storageDelivery.createSignedReadAccess).toHaveBeenCalledWith(
      'storage-avatar-1',
      actor,
    );
    expect(result.data.profileImageUrl).toContain('/api/v1/storage-objects/');
  });

  it('uploads an authenticated customer avatar as a TENANT_PRIVATE storage object', async () => {
    const {
      service,
      customersRepo,
      addressesRepo,
      storageRuntime,
      storageObjects,
      uploadValidation,
    } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.find.mockResolvedValue([]);

    const result = await service.uploadStorefrontCustomerAvatar(actor, {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File);

    const resolution =
      await storageRuntime.resolveProvider.mock.results[0].value;
    expect(resolution.adapter.put).toHaveBeenCalledWith(
      expect.objectContaining({
        contentLength: 8,
        contentType: 'image/png',
      }),
    );
    expect(uploadValidation.validateFileOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'customer_avatar' }),
    );
    expect(storageObjects.registerTenantObjectForTenant).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        objectCategory: 'customer_avatar',
        accessScope: 'TENANT_PRIVATE',
        metadata: expect.objectContaining({ customerId: 'customer-1' }),
      }),
      actor,
    );
    expect(customersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ avatarStorageObjectId: 'storage-avatar-1' }),
    );
    expect(result.data.profileImageUrl).toContain('storage-avatar-1');
  });

  it('does not trust customerId or tenantId values from uploaded avatar request data', async () => {
    const { service, customersRepo, addressesRepo, storageObjects } =
      makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });
    addressesRepo.find.mockResolvedValue([]);

    await service.uploadStorefrontCustomerAvatar(actor, {
      originalname: '../other.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      customerId: 'other-customer',
      tenantId: 'other-tenant',
    } as unknown as Express.Multer.File);

    expect(storageObjects.registerTenantObjectForTenant).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        metadata: expect.objectContaining({ customerId: 'customer-1' }),
      }),
      actor,
    );
  });

  it('marks the previous owned avatar as deleted after replacement', async () => {
    const { service, customersRepo, addressesRepo, storageObjectRepo } =
      makeService();
    customersRepo.findOne.mockResolvedValue({
      ...customer,
      avatarStorageObjectId: 'old-avatar',
    });
    addressesRepo.find.mockResolvedValue([]);
    storageObjectRepo.findOne.mockResolvedValue({
      id: 'old-avatar',
      tenantId: 'tenant-1',
      objectCategory: 'customer_avatar',
      metadata: { customerId: 'customer-1' },
    });

    await service.uploadStorefrontCustomerAvatar(actor, {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File);

    expect(storageObjectRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'old-avatar',
        status: 'DELETED',
        deletedAt: expect.any(Date),
      }),
    );
  });

  it('rejects non-customer avatar uploads', async () => {
    const { service } = makeService();
    await expect(
      service.uploadStorefrontCustomerAvatar(
        { ...actor, role: UserRole.OWNER, customerId: undefined },
        {} as Express.Multer.File,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns own Business/GST profile with NULL fields for existing customers', async () => {
    const { service, customersRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });

    const result = await service.businessProfileForStorefrontCustomer(actor);

    expect(customersRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        tenantId: 'tenant-1',
        deletedAt: expect.anything(),
      },
    });
    expect(result.data).toEqual({
      companyLegalName: 'Old Name',
      gstin: '',
      verified: false,
      status: 'UNVERIFIED',
      message: null,
      certificateUrl: null,
      certificateFileName: null,
      verifiedAt: null,
    });
  });

  it('updates only the authenticated customer Business/GST profile', async () => {
    const { service, customersRepo } = makeService();
    customersRepo.findOne.mockResolvedValue({ ...customer });

    const result = await service.updateStorefrontCustomerBusinessProfile(
      actor,
      {
        companyLegalName: 'Acme Traders Private Limited',
        gstin: '27ABCDE1234F1Z5',
        customerId: 'other-customer',
        tenantId: 'other-tenant',
      } as never,
    );

    expect(customersRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        tenantId: 'tenant-1',
        deletedAt: expect.anything(),
      },
    });
    expect(customersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'customer-1',
        businessLegalName: 'Acme Traders Private Limited',
        gstin: '27ABCDE1234F1Z5',
        gstVerified: false,
        gstStatus: 'DOCUMENT_REQUIRED',
        gstVerifiedAt: null,
      }),
    );
    expect(result.data).toMatchObject({
      companyLegalName: 'Acme Traders Private Limited',
      gstin: '27ABCDE1234F1Z5',
      verified: false,
      status: 'DOCUMENT_REQUIRED',
    });
  });

  it('rejects unauthenticated and wrong-role Business/GST profile access', async () => {
    const { service } = makeService();

    await expect(
      service.businessProfileForStorefrontCustomer({
        ...actor,
        customerId: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.updateStorefrontCustomerBusinessProfile(
        { ...actor, role: UserRole.OWNER, customerId: undefined },
        { companyLegalName: 'Bad' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uploads an authenticated customer GST certificate as a TENANT_PRIVATE storage object', async () => {
    const {
      service,
      customersRepo,
      storageRuntime,
      storageObjects,
      storageDelivery,
      uploadValidation,
    } = makeService();
    customersRepo.findOne.mockResolvedValue({
      ...customer,
      businessLegalName: 'Acme Traders Private Limited',
      gstin: '27ABCDE1234F1Z5',
    });
    storageObjects.registerTenantObjectForTenant.mockResolvedValueOnce({
      id: 'storage-gst-1',
      url: '/api/v1/storage-objects/storage-gst-1/content?token=signed',
    });

    const result = await service.uploadStorefrontCustomerGstCertificate(
      actor,
      {
        companyLegalName: 'Acme Traders Private Limited',
        gstin: '27ABCDE1234F1Z5',
      },
      {
        originalname: 'gst.pdf',
        mimetype: 'application/pdf',
        size: 12,
        buffer: Buffer.from('%PDF-1.4\n'),
      } as Express.Multer.File,
    );

    const resolution =
      await storageRuntime.resolveProvider.mock.results[0].value;
    expect(resolution.adapter.put).toHaveBeenCalledWith(
      expect.objectContaining({
        contentLength: 8,
        contentType: 'image/png',
      }),
    );
    expect(uploadValidation.validateFileOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'customer_gst_certificate' }),
    );
    expect(storageObjects.registerTenantObjectForTenant).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        objectCategory: 'customer_gst_certificate',
        accessScope: 'TENANT_PRIVATE',
        metadata: expect.objectContaining({ customerId: 'customer-1' }),
      }),
      actor,
    );
    expect(customersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        gstCertificateStorageObjectId: 'storage-gst-1',
        gstCertificateFileName: 'avatar.png',
        gstStatus: 'DOCUMENT_UPLOADED',
      }),
    );
    expect(storageDelivery.createSignedReadAccess).toHaveBeenCalledWith(
      'storage-gst-1',
      actor,
    );
    expect(result.data.certificateUrl).toContain('storage-gst-1');
  });

  it('rejects non-customer GST certificate uploads', async () => {
    const { service } = makeService();
    await expect(
      service.uploadStorefrontCustomerGstCertificate(
        { ...actor, role: UserRole.OWNER, customerId: undefined },
        { companyLegalName: 'Bad', gstin: '27ABCDE1234F1Z5' },
        {} as Express.Multer.File,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks only the previous owned GST certificate as deleted after replacement', async () => {
    const { service, customersRepo, storageObjectRepo, storageObjects } =
      makeService();
    customersRepo.findOne.mockResolvedValue({
      ...customer,
      businessLegalName: 'Acme Traders Private Limited',
      gstin: '27ABCDE1234F1Z5',
      gstCertificateStorageObjectId: 'old-gst',
    });
    storageObjects.registerTenantObjectForTenant.mockResolvedValueOnce({
      id: 'new-gst',
      url: '/api/v1/storage-objects/new-gst/content?token=signed',
    });
    storageObjectRepo.findOne.mockResolvedValue({
      id: 'old-gst',
      tenantId: 'tenant-1',
      objectCategory: 'customer_gst_certificate',
      metadata: { customerId: 'customer-1' },
    });

    await service.uploadStorefrontCustomerGstCertificate(
      actor,
      {
        companyLegalName: 'Acme Traders Private Limited',
        gstin: '27ABCDE1234F1Z5',
      },
      {
        originalname: 'gst.pdf',
        mimetype: 'application/pdf',
        size: 12,
        buffer: Buffer.from('%PDF-1.4\n'),
      } as Express.Multer.File,
    );

    expect(storageObjectRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'old-gst',
        status: 'DELETED',
        deletedAt: expect.any(Date),
      }),
    );
  });
  it('blocks cross-tenant Business/GST profile access', async () => {
    const { service, customersRepo } = makeService();
    customersRepo.findOne.mockResolvedValue(null);

    await expect(
      service.businessProfileForStorefrontCustomer({
        ...actor,
        tenantId: 'tenant-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.updateStorefrontCustomerBusinessProfile(
        { ...actor, tenantId: 'tenant-2' },
        { companyLegalName: 'Other Tenant', gstin: '27ABCDE1234F1Z5' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
