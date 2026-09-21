import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendNotificationDto {
  @IsIn(['single_user', 'multiple_users', 'topic'])
  targetType: 'single_user' | 'multiple_users' | 'topic';

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  topic?: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  eventType?: string;
}
