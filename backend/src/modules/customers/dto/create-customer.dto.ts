import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { CustomerStatus } from '../../../common/enums/customer-status.enum';
import { CustomerAddressInputDto } from './customer-address-input.dto';

export class CreateCustomerDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(8, 20)
  mobile: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsNumberString()
  creditLimit?: string;

  @IsOptional()
  @IsNumberString()
  creditBalance?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressInputDto)
  addresses?: CustomerAddressInputDto[];
}
