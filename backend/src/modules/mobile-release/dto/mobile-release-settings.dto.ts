import { IsIn, IsOptional, IsString } from 'class-validator';

export class PutMobileReleaseSettingsDto {
  @IsOptional()
  @IsString()
  googlePackageName?: string;

  @IsOptional()
  @IsString()
  googleServiceAccountJson?: string;

  @IsOptional()
  @IsIn(['internal', 'alpha', 'beta', 'production'])
  googleDefaultTrack?: 'internal' | 'alpha' | 'beta' | 'production';

  @IsOptional()
  @IsString()
  googleReleaseNotesTemplate?: string;

  @IsOptional()
  @IsString()
  appleBundleIdentifier?: string;

  @IsOptional()
  @IsString()
  appleIssuerId?: string;

  @IsOptional()
  @IsString()
  appleKeyId?: string;

  @IsOptional()
  @IsString()
  appleApiKey?: string;

  @IsOptional()
  @IsString()
  appleTeamId?: string;
}
