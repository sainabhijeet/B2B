import { IsString } from 'class-validator';

export class GenerateInvoiceDto {
  @IsString()
  orderId: string;
}
