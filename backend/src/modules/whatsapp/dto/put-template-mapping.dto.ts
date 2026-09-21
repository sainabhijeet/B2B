import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { WHATSAPP_HYBRID_TEMPLATE_KEYS } from '../whatsapp-hybrid-template-key';

export class PutDistributorTemplateMappingItemDto {
  @IsString()
  @IsIn([...WHATSAPP_HYBRID_TEMPLATE_KEYS])
  template_key: string;

  @ValidateIf((o: PutDistributorTemplateMappingItemDto) => o.is_active !== false)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  meta_template_name?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class PutDistributorTemplateMappingDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PutDistributorTemplateMappingItemDto)
  items: PutDistributorTemplateMappingItemDto[];
}
