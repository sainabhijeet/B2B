import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { MediaLifecycleService } from './media-lifecycle.service';

const actor = {
  sub: '11111111-1111-4111-8111-111111111111',
  role: UserRole.SUPER_ADMIN,
  tenantId: null,
};
const object = {
  id: '22222222-2222-4222-8222-222222222222',
  ownershipType: 'PLATFORM',
  tenantId: null,
  providerId: '33333333-3333-4333-8333-333333333333',
  objectKey: 'media-library/test.png',
  status: 'ACTIVE',
  scanRequired: false,
  scanStatus: 'NOT_REQUIRED',
  deletedAt: null,
  folderId: '44444444-4444-4444-8444-444444444444',
};

function setup(row: any = { ...object }) {
  const audit = { save: jest.fn(async (value) => value) };
  const repository: any = {
    findOne: jest.fn(async () => row),
    find: jest.fn(async () => (row ? [{ id: row.id }] : [])),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const manager: any = {
    getRepository: jest.fn((entity) =>
      entity.name === 'AuditLog' ? audit : repository,
    ),
    transaction: jest.fn(async (callback) => callback(manager)),
  };
  repository.manager = manager;
  const adapter = { head: jest.fn(async () => ({ contentLength: 10 })) };
  const quarantine = { delete: jest.fn(async () => undefined) };
  const runtime = {
    resolveProvider: jest.fn(async () => ({
      metadata: { providerId: object.providerId },
      adapter,
    })),
  };
  return {
    service: new MediaLifecycleService(
      repository as never,
      audit as never,
      runtime as never,
      quarantine as never,
    ),
    repository,
    audit,
    adapter,
    quarantine,
  };
}

describe('MediaLifecycleService', () => {
  it('rejects non-SUPER_ADMIN actors before accessing media', async () => {
    const test = setup();
    await expect(
      test.service.delete(object.id, {
        ...actor,
        role: UserRole.OWNER,
        tenantId: '55555555-5555-4555-8555-555555555555',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(test.repository.findOne).not.toHaveBeenCalled();
  });

  it('soft deletes ACTIVE platform media with a conditional update and audit', async () => {
    const { service, repository, audit } = setup();
    await expect(service.delete(object.id, actor)).resolves.toEqual({
      id: object.id,
      status: 'DELETED',
    });
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ownershipType: 'PLATFORM',
        status: 'ACTIVE',
      }),
      expect.objectContaining({ status: 'DELETED' }),
    );
    expect(audit.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEDIA_DELETED' }),
    );
  });

  it.each(['QUARANTINED', 'SCAN_FAILED', 'INFECTED'] as const)(
    'deletes and audits quarantined media in %s scan state',
    async (scanStatus) => {
      const test = setup({
        ...object,
        status: 'QUARANTINED',
        scanRequired: true,
        scanStatus,
      });
      await expect(test.service.delete(object.id, actor)).resolves.toEqual({
        id: object.id,
        status: 'DELETED',
      });
      expect(test.repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'QUARANTINED' }),
        expect.objectContaining({ status: 'DELETED' }),
      );
      expect(test.quarantine.delete).toHaveBeenCalledWith(object.id);
      expect(test.audit.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEDIA_QUARANTINE_DELETED' }),
      );
    },
  );

  it('makes quarantined cleanup idempotent and tolerates missing physical content', async () => {
    const test = setup({
      ...object,
      status: 'DELETED',
      deletedAt: new Date(),
      scanRequired: true,
      scanStatus: 'SCAN_FAILED',
    });
    await expect(test.service.delete(object.id, actor)).resolves.toEqual({
      id: object.id,
      status: 'DELETED',
    });
    expect(test.repository.update).not.toHaveBeenCalled();
    expect(test.quarantine.delete).toHaveBeenCalledWith(object.id);
  });

  it('does not restore infected or failed quarantined media', async () => {
    for (const scanStatus of ['INFECTED', 'SCAN_FAILED'] as const) {
      const test = setup({
        ...object,
        status: 'DELETED',
        deletedAt: new Date(),
        scanRequired: true,
        scanStatus,
      });
      await expect(
        test.service.restore(object.id, actor),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(test.repository.update).not.toHaveBeenCalled();
    }
  });

  it('rejects invalid state, non-platform ownership, and concurrent transitions', async () => {
    await expect(
      setup({ ...object, status: 'DELETED' }).service.delete(object.id, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      setup({ ...object, ownershipType: 'TENANT' }).service.delete(
        object.id,
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    const concurrent = setup();
    concurrent.repository.update.mockResolvedValueOnce({ affected: 0 });
    await expect(
      concurrent.service.delete(object.id, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('restores only when physical content exists without changing folder/key/provider', async () => {
    const deleted = { ...object, status: 'DELETED', deletedAt: new Date() };
    const { service, repository, adapter } = setup(deleted);
    await expect(service.restore(object.id, actor)).resolves.toEqual({
      id: object.id,
      status: 'ACTIVE',
    });
    expect(adapter.head).toHaveBeenCalledWith(object.objectKey);
    const patch = repository.update.mock.calls[0][1];
    expect(patch).toMatchObject({ status: 'ACTIVE', deletedAt: null });
    expect(patch).not.toHaveProperty('folderId');
    expect(patch).not.toHaveProperty('providerId');
    expect(patch).not.toHaveProperty('objectKey');
  });

  it('does not restore missing physical content', async () => {
    const test = setup({
      ...object,
      status: 'DELETED',
      deletedAt: new Date(),
    });
    test.adapter.head.mockResolvedValueOnce(null as never);
    await expect(test.service.restore(object.id, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(test.repository.update).not.toHaveBeenCalled();
  });

  it('deduplicates bulk IDs and reports unknown IDs with a bounded audit summary', async () => {
    const unknown = '66666666-6666-4666-8666-666666666666';
    const { service, audit } = setup();
    const result = await service.bulkDelete(
      [object.id, object.id, unknown],
      actor,
    );
    expect(result).toMatchObject({
      requested: 3,
      processed: 2,
      succeeded: 1,
      failed: 1,
    });
    expect(result.results).toContainEqual(
      expect.objectContaining({ id: unknown, success: false }),
    );
    expect(audit.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MEDIA_BULK_DELETED',
        metadata: expect.objectContaining({ processed: 2, succeeded: 1 }),
      }),
    );
  });
});
