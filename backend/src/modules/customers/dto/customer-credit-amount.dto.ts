import { IsNumberString, Matches } from 'class-validator';

export class CustomerCreditAmountDto {
  @IsNumberString()
  @Matches(/^\d+(\.\d{1,2})?$/u, { message: 'amount must be a non-negative decimal with up to 2 fractional digits' })
  amount: string;
}
