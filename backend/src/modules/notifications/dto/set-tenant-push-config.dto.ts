import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class SetTenantPushConfigDto {
  @IsIn(['firebase', 'custom'])
  provider: 'firebase' | 'custom';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
