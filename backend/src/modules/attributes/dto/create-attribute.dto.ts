import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAttributeDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @Length(2, 255)
  name: string;

  @IsString()
  @Length(2, 255)
  slug: string;

  @IsString()
  dataType: string;

  @IsOptional()
  @IsString()
  status?: string;
}
