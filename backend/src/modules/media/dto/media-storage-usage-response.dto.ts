export type MediaStorageUsageSummaryDto = {
  totalBytes: string;
  activeBytes: string;
  deletedBytes: string;
  totalObjects: number;
  activeObjects: number;
  deletedObjects: number;
};

export type MediaStorageOwnershipUsageDto = {
  ownershipType: 'PLATFORM' | 'TENANT';
  activeBytes: string;
  activeObjects: number;
};

export type MediaStorageBreakdownDto = {
  key: string;
  label: string;
  activeBytes: string;
  activeObjects: number;
};

export type MediaStorageProviderUsageDto = {
  providerId: string | null;
  providerName: string;
  providerType: string | null;
  status: string | null;
  isDefault: boolean;
  healthStatus: string;
  lastCheckedAt: string | null;
  activeBytes: string;
  activeObjects: number;
  deletedBytes: string;
  deletedObjects: number;
};

export type MediaStorageUsageResponseDto = {
  semantics: {
    source: 'storage_objects_registry';
    scope: 'PLATFORM_WIDE';
    physicalProviderUsage: false;
    activeUsageExcludesDeleted: true;
  };
  summary: MediaStorageUsageSummaryDto;
  byOwnership: MediaStorageOwnershipUsageDto[];
  byFileType: MediaStorageBreakdownDto[];
  byCategory: MediaStorageBreakdownDto[];
  byProvider: MediaStorageProviderUsageDto[];
  quota: {
    configured: false;
    limitBytes: null;
    remainingBytes: null;
    percentageUsed: null;
  };
  generatedAt: string;
};
