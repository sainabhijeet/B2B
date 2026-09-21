import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class SmsProviderItemDto {
  @ApiProperty({ minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id: string;

  @ApiProperty({ example: 'MSG91' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  provider: string;

  @ApiPropertyOptional({ description: 'Set when rotating key; omit or empty to keep previous value.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  apiKey?: string;

  @ApiProperty({ example: 'SHOPZG' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  senderId: string;

  @ApiProperty({ example: 'Transactional' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  route: string;

  @ApiProperty({ enum: ['active', 'inactive', 'error'], example: 'active' })
  @IsString()
  @IsIn(['active', 'inactive', 'error'])
  status: 'active' | 'inactive' | 'error';
}

export class PutSmsProvidersDto {
  @ApiProperty({ type: [SmsProviderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmsProviderItemDto)
  providers: SmsProviderItemDto[];
}
