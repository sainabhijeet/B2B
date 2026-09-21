import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

enum SubscriptionAdminAction {
  EXTEND = 'EXTEND',
  CANCEL = 'CANCEL',
}

export class AdminUpdateSubscriptionDto {
  @IsUUID()
  subscriptionId: string;

  @IsEnum(SubscriptionAdminAction)
  action: SubscriptionAdminAction;

  @IsOptional()
  @IsString()
  endDate?: string;
}
