import { IsString, Length } from 'class-validator';

export class CreateCustomerGroupDto {
  @IsString()
  @Length(1, 255)
  name: string;
}
