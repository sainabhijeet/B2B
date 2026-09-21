import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class BuildListQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'QUEUED', 'RUNNING', 'FAILED', 'SUCCESS'])
  status?: 'PENDING' | 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS';

  @IsOptional()
  fromDate?: string;

  @IsOptional()
  toDate?: string;
}
