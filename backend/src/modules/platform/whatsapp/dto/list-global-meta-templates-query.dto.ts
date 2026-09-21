import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListGlobalMetaTemplatesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  waba_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;
}
