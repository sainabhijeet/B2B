import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class StorefrontCustomerProfileUpdateDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;
}
