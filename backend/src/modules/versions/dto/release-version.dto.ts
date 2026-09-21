import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  releaseNotes?: string;
}
