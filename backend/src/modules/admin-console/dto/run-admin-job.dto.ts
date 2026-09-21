import { IsIn, IsString } from 'class-validator';

export class RunAdminJobDto {
  @IsString()
  @IsIn(['CLEAN_OLD_LOGS', 'RETRY_FAILED_BUILDS'])
  jobKey: 'CLEAN_OLD_LOGS' | 'RETRY_FAILED_BUILDS';
}
