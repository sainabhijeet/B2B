import { IsOptional, IsUUID } from 'class-validator';

/**
 * Distributor / staff: exactly one of:
 * - `theme_id` — WEB (full storefront select) or MOBILE (mobile slot only)
 * - `combo_id` — web + mobile combo pack
 */
export class SelectDistributorThemeDto {
  @IsOptional()
  @IsUUID()
  theme_id?: string;

  @IsOptional()
  @IsUUID()
  combo_id?: string;

  @IsOptional()
  @IsUUID()
  tenant_id?: string;
}
