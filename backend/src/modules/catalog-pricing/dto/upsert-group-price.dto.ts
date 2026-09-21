import { IsNumberString, IsUUID } from 'class-validator';

export class UpsertGroupPriceDto {
  @IsUUID()
  groupId: string;

  @IsUUID()
  productVariantId: string;

  @IsNumberString()
  price: string;
}
