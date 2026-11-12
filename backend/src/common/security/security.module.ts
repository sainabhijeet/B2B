import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CredentialEncryptionService } from './credential-encryption.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttlMs', 60_000),
          limit: config.get<number>('throttle.limit', 60),
        },
      ],
    }),
  ],
  providers: [
    CredentialEncryptionService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [CredentialEncryptionService],
})
export class SecurityModule {}
