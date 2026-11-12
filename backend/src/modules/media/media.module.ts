import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createConnection } from 'node:net';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { MediaFolder } from '../../common/entities/media-folder.entity';
import { StorageObject } from '../../common/entities/storage-object.entity';
import { PlatformStorageProvidersModule } from '../storage-providers/platform-storage-providers.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { MediaFoldersController } from './media-folders.controller';
import { MediaFoldersService } from './media-folders.service';
import { MediaController } from './media.controller';
import { MediaLifecycleService } from './media-lifecycle.service';
import { MediaStorageUsageController } from './media-storage-usage.controller';
import { MediaStorageUsageService } from './media-storage-usage.service';
import { MediaService } from './media.service';
import {
  CLAMD_SOCKET_FACTORY,
  MEDIA_MALWARE_SCANNER,
} from './media-malware-scanner.types';
import { UnavailableMediaMalwareScanner } from './media-malware-scanner.service';
import { MediaMalwareScanService } from './media-malware-scan.service';
import { MediaQuarantineStorageService } from './media-quarantine-storage.service';
import { PaymentProofScanRecoveryService } from './payment-proof-scan-recovery.service';
import { MediaScanQueueService } from './media-scan-queue.service';
import { ClamdMediaMalwareScanner } from './clamd-media-malware-scanner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, MediaFolder, StorageObject]),
    PlatformStorageProvidersModule,
    TenancyModule,
  ],
  controllers: [
    MediaStorageUsageController,
    MediaFoldersController,
    MediaController,
  ],
  providers: [
    MediaFoldersService,
    MediaLifecycleService,
    MediaService,
    MediaStorageUsageService,
    MediaMalwareScanService,
    MediaQuarantineStorageService,
    PaymentProofScanRecoveryService,
    MediaScanQueueService,
    {
      provide: CLAMD_SOCKET_FACTORY,
      useValue: createConnection,
    },
    ClamdMediaMalwareScanner,
    UnavailableMediaMalwareScanner,
    {
      provide: MEDIA_MALWARE_SCANNER,
      inject: [
        ConfigService,
        ClamdMediaMalwareScanner,
        UnavailableMediaMalwareScanner,
      ],
      useFactory: (
        config: ConfigService,
        clamd: ClamdMediaMalwareScanner,
        unavailable: UnavailableMediaMalwareScanner,
      ) =>
        config.get<string>('mediaMalware.scanner.provider', 'unavailable') ===
        'clamd'
          ? clamd
          : unavailable,
    },
  ],
  exports: [
    MediaMalwareScanService,
    MediaQuarantineStorageService,
    PaymentProofScanRecoveryService,
    MediaScanQueueService,
  ],
})
export class MediaModule {}
