import { IsString, Length } from 'class-validator';

export class DeleteStorefrontCustomerAccountDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
