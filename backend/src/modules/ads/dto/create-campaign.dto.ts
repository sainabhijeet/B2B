import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(128)
  placement: string;

  @IsOptional()
  @IsIn(['BANNER_AD', 'PRODUCT_AD', 'SPONSORED_LISTING'])
  adType?: 'BANNER_AD' | 'PRODUCT_AD' | 'SPONSORED_LISTING';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'SCHEDULED', 'ENDED'])
  status?: 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'ENDED';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @IsOptional()
  @IsIn(['ALL', 'MOBILE', 'TABLET', 'DESKTOP'])
  deviceType?: 'ALL' | 'MOBILE' | 'TABLET' | 'DESKTOP';

  @IsOptional()
  @IsIn(['FREE_ONLY', 'ALL_PLANS'])
  planTarget?: 'FREE_ONLY' | 'ALL_PLANS';
}
