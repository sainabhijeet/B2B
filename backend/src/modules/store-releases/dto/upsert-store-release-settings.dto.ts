import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertStoreReleaseSettingsDto {
  @IsIn(['ANDROID', 'IOS'])
  platform: 'ANDROID' | 'IOS';

  @IsString()
  @MaxLength(255)
  packageNameOrBundleId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  releaseTrack?: string;
}
