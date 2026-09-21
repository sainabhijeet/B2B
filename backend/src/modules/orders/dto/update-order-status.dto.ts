import { IsIn, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn([
    'PENDING',
    'PAYMENT_UPLOADED',
    'PROCESSING',
    'DISPATCHED',
    'DELIVERED',
    'CANCELLED',
  ])
  status: string;
}
