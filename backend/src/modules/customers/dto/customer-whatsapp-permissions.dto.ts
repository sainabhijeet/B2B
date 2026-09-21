import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

/** Partial update — only provided fields are changed. */
export class PatchCustomerWhatsappPermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewInvoice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canPlaceOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canRepeatOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewCredit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canReceiveBroadcast?: boolean;
}

export class BulkCustomerWhatsappPermissionsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  customerIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewInvoice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canPlaceOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canRepeatOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewCredit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canReceiveBroadcast?: boolean;
}
