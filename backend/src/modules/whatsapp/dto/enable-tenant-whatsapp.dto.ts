import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EnableTenantWhatsappDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  phoneNumberId: string;

  /** When true, `access_token` on the row is used for Graph API; otherwise platform shared env token. */
  @IsOptional()
  @IsBoolean()
  useOwnToken?: boolean;

  /** Required when `useOwnToken` is true and no token is stored yet; optional to rotate / keep existing. */
  @IsOptional()
  @IsString()
  accessToken?: string;

  /** Same role as `WHATSAPP_VERIFY_TOKEN` in .env, stored per line when `useOwnToken`. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  verifyToken?: string;

  /** Same role as `WHATSAPP_APP_SECRET` in .env, stored per line when `useOwnToken`. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  appSecret?: string;

  /** WhatsApp Business Account id for template list sync (`GET /{waba-id}/message_templates`). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  whatsappBusinessAccountId?: string;
}
