import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStoreReleaseDto {
  @IsUUID()
  buildArtifactId: string;

  @IsIn(['ANDROID', 'IOS'])
  platform: 'ANDROID' | 'IOS';

  @IsIn(['GOOGLE_PLAY', 'APPLE_APP_STORE'])
  storeProvider: 'GOOGLE_PLAY' | 'APPLE_APP_STORE';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  track?: string;
}
