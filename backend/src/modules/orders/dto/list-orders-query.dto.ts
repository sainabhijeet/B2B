import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/** Query filter for `GET /orders` — maps to `orders.order_source`. */
export type OrderSourceFilterDto = 'whatsapp' | 'storefront' | 'manual' | 'app';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    enum: ['whatsapp', 'storefront', 'manual', 'app'],
    description: '`app` is an alias for storefront (consumer app / web checkout).',
  })
  @IsOptional()
  @IsIn(['whatsapp', 'storefront', 'manual', 'app'])
  source?: OrderSourceFilterDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
