import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWhatsappConfigDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  phoneNumberId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  whatsappBusinessAccountId?: string;

  /** Required when `use_own_token` is true and the line has no stored token yet. */
  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useOwnToken?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  webhookVerifyToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  appSecret?: string;

  /** When true, after save calls Meta Graph `GET /{phone_number_id}` to validate the token. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  validateTokenOnSave?: boolean;
}
