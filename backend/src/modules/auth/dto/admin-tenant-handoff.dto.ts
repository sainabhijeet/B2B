import { IsString, IsUUID, Length } from 'class-validator';

export class AdminTenantHandoffDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  @Length(8, 160)
  deviceId: string;
}
