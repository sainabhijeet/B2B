import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBuildDto {
  @IsIn(['ANDROID_APK', 'ANDROID_AAB', 'IOS_IPA', 'WEB'])
  buildType: 'ANDROID_APK' | 'ANDROID_AAB' | 'IOS_IPA' | 'WEB';

  @IsString()
  @MaxLength(255)
  packageName: string;

  @IsString()
  @MaxLength(255)
  appName: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  themeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
