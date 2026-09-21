import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  slug?: string;

  @IsOptional()
  @IsString()
  dataType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
