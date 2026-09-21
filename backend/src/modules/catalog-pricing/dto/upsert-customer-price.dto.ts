import { IsNumberString, IsUUID } from 'class-validator';

export class UpsertCustomerPriceDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  productVariantId: string;

  @IsNumberString()
  price: string;
}
