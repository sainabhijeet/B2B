import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { WA_MENU_BUTTON_TITLE_MAX, WHATSAPP_TENANT_MENU_KEYS, type WhatsappTenantMenuKey } from '../whatsapp-menu-key';

export class TenantWhatsappMenuItemDto {
  @ApiProperty({ enum: WHATSAPP_TENANT_MENU_KEYS })
  @IsString()
  @IsIn([...WHATSAPP_TENANT_MENU_KEYS])
  menuKey: WhatsappTenantMenuKey;

  @ApiProperty({
    maxLength: WA_MENU_BUTTON_TITLE_MAX,
    description: 'WhatsApp reply-button title limit (20 chars).',
  })
  @IsString()
  @MaxLength(WA_MENU_BUTTON_TITLE_MAX)
  label: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  position: number;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class PutTenantWhatsappMenuDto {
  @ApiProperty({ type: [TenantWhatsappMenuItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TenantWhatsappMenuItemDto)
  items: TenantWhatsappMenuItemDto[];
}
