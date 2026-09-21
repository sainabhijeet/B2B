import { IsInt, IsNumberString, IsUUID, Min } from 'class-validator';

export class UpsertQuantityPriceDto {
  @IsUUID()
  productVariantId: string;

  @IsInt()
  @Min(1)
  minQty: number;

  @IsNumberString()
  price: string;
}
