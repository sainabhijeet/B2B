import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListBuildsQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'QUEUED', 'RUNNING', 'FAILED', 'SUCCESS'])
  status?: 'PENDING' | 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS';

  @IsOptional()
  @IsIn(['ANDROID_APK', 'ANDROID_AAB', 'WEB'])
  buildType?: 'ANDROID_APK' | 'ANDROID_AAB' | 'WEB';
}
