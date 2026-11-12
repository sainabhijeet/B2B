import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  PlatformStorageProviderMode,
  PlatformStorageProviderStatus,
  PlatformStorageProviderType,
} from '../../../common/entities/platform-storage-provider.entity';

export class UpdatePlatformStorageProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['LOCAL', 'S3_COMPATIBLE'])
  type?: PlatformStorageProviderType;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: PlatformStorageProviderStatus;

  @IsOptional()
  @IsIn(['TEST', 'LIVE'])
  mode?: PlatformStorageProviderMode;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  endpoint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  bucketName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  publicBaseUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  accessKeyId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  secretAccessKey?: string;
}
