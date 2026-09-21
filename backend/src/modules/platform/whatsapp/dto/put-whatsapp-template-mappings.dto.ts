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
  ValidateNested,
} from 'class-validator';
import { WHATSAPP_HYBRID_TEMPLATE_KEYS } from '../../../whatsapp/whatsapp-hybrid-template-key';

export class WhatsappTemplateMappingItemDto {
  @IsString()
  @IsIn([...WHATSAPP_HYBRID_TEMPLATE_KEYS])
  templateKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  metaTemplateName: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PutWhatsappTemplateMappingsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => WhatsappTemplateMappingItemDto)
  items: WhatsappTemplateMappingItemDto[];
}
