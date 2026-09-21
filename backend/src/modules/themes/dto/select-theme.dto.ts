import { IsOptional, IsUUID } from 'class-validator';

/** Exactly one mode: legacy `themeId` (web, auto-pairs mobile from combo if exists), `comboId`, or `webThemeId`+`mobileThemeId`. */
export class SelectThemeDto {
  @IsOptional()
  @IsUUID()
  themeId?: string;

  @IsOptional()
  @IsUUID()
  comboId?: string;

  @IsOptional()
  @IsUUID()
  webThemeId?: string;

  @IsOptional()
  @IsUUID()
  mobileThemeId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
