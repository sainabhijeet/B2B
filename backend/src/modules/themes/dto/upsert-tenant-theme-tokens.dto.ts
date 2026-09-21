import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class UpsertTenantThemeTokensDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsObject()
  tokens: Record<string, unknown>;
}
