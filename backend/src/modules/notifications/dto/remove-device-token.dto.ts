import { IsString } from 'class-validator';

export class RemoveDeviceTokenDto {
  @IsString()
  token: string;
}
