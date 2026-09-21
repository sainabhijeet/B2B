import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsUUID()
  buildJobId: string;

  @IsOptional()
  @IsUUID()
  artifactId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'versionName must be in major.minor.patch format' })
  versionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  releaseNotes?: string;
}
