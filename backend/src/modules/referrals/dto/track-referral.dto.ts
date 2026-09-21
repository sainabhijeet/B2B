import { IsOptional, IsUUID } from 'class-validator';

export class TrackReferralDto {
  @IsUUID()
  referredTenantId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;
}
