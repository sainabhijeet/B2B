import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class StorefrontCustomerRegisterDto {
  @IsString()
  @Length(1, 255)
  companyName: string;

  @IsString()
  @Length(8, 20)
  mobile: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
