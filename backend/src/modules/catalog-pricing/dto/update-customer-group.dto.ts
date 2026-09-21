import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateCustomerGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;
}
