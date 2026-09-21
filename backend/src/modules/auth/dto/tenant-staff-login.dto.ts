import { IsEmail, IsString, Length } from 'class-validator';

/** Distributor / tenant panel: OWNER, MANAGER, STAFF with email + password. */
export class TenantStaffLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsString()
  deviceId: string;
}
