import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListVersionsQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ROLLED_BACK'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'ROLLED_BACK';
}
