import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAttributeValueDto {
  @IsString()
  @Length(1, 255)
  value: string;

  @IsString()
  @Length(1, 255)
  slug: string;

  @IsOptional()
  @IsString()
  status?: string;
}
