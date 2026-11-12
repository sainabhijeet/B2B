import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { PlatformStorageProvider } from '../../common/entities/platform-storage-provider.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { SecurityModule } from '../../common/security/security.module';
import { PlatformStorageProvidersController } from './platform-storage-providers.controller';
import { PlatformStorageProvidersService } from './platform-storage-providers.service';
import { PlatformStorageRuntimeService } from './platform-storage-runtime.service';
import {
  defaultStorageDnsLookup,
  STORAGE_DNS_LOOKUP,
  StorageEndpointSecurityService,
} from './storage-endpoint-security.service';
import { StorageObjectDeliveryController } from './storage-object-delivery.controller';
import { StorageObjectDeliveryService } from './storage-object-delivery.service';
import { StorageObjectMaintenanceService } from './storage-object-maintenance.service';
import { StorageObjectSignedAccessService } from './storage-object-signed-access.service';
import { StorageObjectsService } from './storage-objects.service';
import { StorageProviderAdapter } from './storage-provider.adapter';
import { UploadValidationService } from './upload-validation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      PlatformStorageProvider,
      StorageObject,
    ]),
    SecurityModule,
  ],
  controllers: [
    PlatformStorageProvidersController,
    StorageObjectDeliveryController,
  ],
  providers: [
    {
      provide: STORAGE_DNS_LOOKUP,
      useValue: defaultStorageDnsLookup,
    },
    PlatformStorageProvidersService,
    PlatformStorageRuntimeService,
    StorageEndpointSecurityService,
    StorageObjectDeliveryService,
    StorageObjectMaintenanceService,
    StorageObjectSignedAccessService,
    StorageObjectsService,
    StorageProviderAdapter,
    UploadValidationService,
  ],
  exports: [
    PlatformStorageProvidersService,
    PlatformStorageRuntimeService,
    StorageEndpointSecurityService,
    StorageObjectDeliveryService,
    StorageObjectMaintenanceService,
    StorageObjectSignedAccessService,
    StorageObjectsService,
    StorageProviderAdapter,
    UploadValidationService,
  ],
})
export class PlatformStorageProvidersModule {}
