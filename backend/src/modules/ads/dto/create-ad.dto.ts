import { IsDateString, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** @deprecated Prefer POST /ads/campaigns + creatives; kept for backward compatibility. */
export class CreateAdDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(128)
  placement: string;

  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
