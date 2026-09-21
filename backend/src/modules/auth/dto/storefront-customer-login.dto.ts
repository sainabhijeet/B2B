import { IsString, Matches } from 'class-validator';

export class StorefrontCustomerLoginDto {
  @IsString()
  @Matches(/^\d{8,20}$/)
  mobile: string;
}
