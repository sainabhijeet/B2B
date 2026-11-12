import { MediaStorageUsageService } from './media-storage-usage.service';

function createService(results: unknown[][]) {
  const repository = {
    query: jest.fn(),
    find: jest.fn(),
  };
  for (const result of results) repository.query.mockResolvedValueOnce(result);
  return {
    repository,
    service: new MediaStorageUsageService(repository as never),
  };
}

describe('MediaStorageUsageService', () => {
  it('returns authoritative active/deleted totals and excludes deleted bytes from active usage', async () => {
    const { service, repository } = createService([
      [
        {
          total_bytes: '900719925474099312345',
          active_bytes: '700',
          deleted_bytes: '300',
          total_objects: '4',
          active_objects: '3',
          deleted_objects: '1',
          platform_active_bytes: '500',
          platform_active_objects: '2',
          tenant_active_bytes: '200',
          tenant_active_objects: '1',
        },
      ],
      [
        { key: 'images', active_bytes: '500', active_objects: '2' },
        { key: 'pdf', active_bytes: '200', active_objects: '1' },
      ],
      [{ key: 'media_library', active_bytes: '700', active_objects: '3' }],
      [
        {
          provider_id: '11111111-1111-4111-8111-111111111111',
          provider_name: 'Local Storage',
          provider_type: 'LOCAL',
          provider_status: 'active',
          is_default: true,
          health_status: 'HEALTHY',
          last_checked_at: new Date('2026-09-17T00:00:00.000Z'),
          active_bytes: '700',
          active_objects: '3',
          deleted_bytes: '300',
          deleted_objects: '1',
        },
      ],
    ]);

    const result = await service.getUsage();

    expect(result.summary).toEqual({
      totalBytes: '900719925474099312345',
      activeBytes: '700',
      deletedBytes: '300',
      totalObjects: 4,
      activeObjects: 3,
      deletedObjects: 1,
    });
    expect(result.byOwnership).toEqual([
      {
        ownershipType: 'PLATFORM',
        activeBytes: '500',
        activeObjects: 2,
      },
      {
        ownershipType: 'TENANT',
        activeBytes: '200',
        activeObjects: 1,
      },
    ]);
    expect(result.byFileType).toEqual([
      {
        key: 'images',
        label: 'Images',
        activeBytes: '500',
        activeObjects: 2,
      },
      {
        key: 'pdf',
        label: 'PDF',
        activeBytes: '200',
        activeObjects: 1,
      },
    ]);
    expect(result.byProvider[0]).toMatchObject({
      providerName: 'Local Storage',
      providerType: 'LOCAL',
      isDefault: true,
      healthStatus: 'HEALTHY',
      activeBytes: '700',
      deletedBytes: '300',
    });
    expect(result.quota.configured).toBe(false);
    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.query).toHaveBeenCalledTimes(4);
    const sql = repository.query.mock.calls.map(([query]) => query).join(' ');
    expect(sql).toContain("status = 'ACTIVE'");
    expect(sql).toContain("status = 'DELETED'");
    expect(sql).toContain('GROUP BY');
    expect(sql).not.toContain('credentials');
    expect(sql).not.toContain('configuration');
  });

  it('returns safe zero values for an empty registry', async () => {
    const { service } = createService([
      [
        {
          total_bytes: '0',
          active_bytes: '0',
          deleted_bytes: '0',
          total_objects: '0',
          active_objects: '0',
          deleted_objects: '0',
          platform_active_bytes: '0',
          platform_active_objects: '0',
          tenant_active_bytes: '0',
          tenant_active_objects: '0',
        },
      ],
      [],
      [],
      [],
    ]);

    const result = await service.getUsage();

    expect(result.summary.activeBytes).toBe('0');
    expect(result.summary.activeObjects).toBe(0);
    expect(result.byFileType).toEqual([]);
    expect(result.byCategory).toEqual([]);
    expect(result.byProvider).toEqual([]);
  });

  it('supports zero-byte objects and safely maps unassigned provider usage', async () => {
    const { service } = createService([
      [
        {
          total_bytes: '0',
          active_bytes: '0',
          deleted_bytes: '0',
          total_objects: '1',
          active_objects: '1',
          deleted_objects: '0',
          platform_active_bytes: '0',
          platform_active_objects: '1',
          tenant_active_bytes: '0',
          tenant_active_objects: '0',
        },
      ],
      [{ key: 'other', active_bytes: '0', active_objects: '1' }],
      [{ key: 'other', active_bytes: '0', active_objects: '1' }],
      [
        {
          provider_id: null,
          provider_name: null,
          provider_type: null,
          provider_status: null,
          health_status: null,
          active_bytes: '0',
          active_objects: '1',
          deleted_bytes: '0',
          deleted_objects: '0',
        },
      ],
    ]);

    const result = await service.getUsage();

    expect(result.summary.activeObjects).toBe(1);
    expect(result.byProvider[0]).toEqual(
      expect.objectContaining({
        providerId: null,
        providerName: 'Unassigned / legacy local storage',
        healthStatus: 'UNKNOWN',
        activeBytes: '0',
        activeObjects: 1,
      }),
    );
  });

  it('does not serialize provider credentials, endpoints, paths, or tokens', async () => {
    const { service } = createService([
      [{}],
      [],
      [],
      [
        {
          provider_id: '11111111-1111-4111-8111-111111111111',
          provider_name: 'Safe provider',
          provider_type: 'LOCAL',
          provider_status: 'active',
          health_status: 'UNKNOWN',
          active_bytes: '0',
          active_objects: '0',
          deleted_bytes: '0',
          deleted_objects: '0',
          credentials: 'secret',
          configuration: { storageRoot: 'C:\\private' },
          token: 'signed-secret',
        },
      ],
    ]);

    const serialized = JSON.stringify(await service.getUsage());

    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('credentials');
    expect(serialized).not.toContain('configuration');
    expect(serialized).not.toContain('C:\\private');
    expect(serialized).not.toContain('token');
  });
});
