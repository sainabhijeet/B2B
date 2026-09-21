import { IsString } from 'class-validator';

export class CustomerFirebaseLoginDto {
  @IsString()
  tenantId: string;

  @IsString()
  idToken: string;

  @IsString()
  deviceId: string;
}
