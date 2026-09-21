import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadGooglePlayDto {
  @IsOptional()
  @IsIn(['internal', 'alpha', 'beta', 'production'])
  track?: 'internal' | 'alpha' | 'beta' | 'production';

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsString()
  artifactId?: string;
}

export class UploadAppStoreDto {
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsString()
  artifactId?: string;
}

export class SubmitAppleReviewDto {
  @IsIn(['TESTFLIGHT', 'APP_REVIEW'])
  destination: 'TESTFLIGHT' | 'APP_REVIEW';
}
