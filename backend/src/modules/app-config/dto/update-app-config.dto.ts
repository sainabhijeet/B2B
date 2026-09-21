import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const toBool = (v: unknown): boolean | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === '') return false;
  }
  return undefined;
};

/** Partial update for distributor `PUT /distributor/app-config` (and legacy PATCH body). */
export class UpdateAppConfigDto {
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  allowGuestAccess?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  showPricesToGuest?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  allowGuestCart?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  enableRepeatOrder?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  enableCreditView?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  enableNotifications?: boolean;

  @IsOptional()
  @IsIn(['grid', 'list'])
  defaultHomeLayout?: 'grid' | 'list';

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  showBanner?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  selectedLanguageCode?: string;
}
