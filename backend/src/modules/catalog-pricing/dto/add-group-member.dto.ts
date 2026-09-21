import { IsUUID } from 'class-validator';

export class AddGroupMemberDto {
  @IsUUID()
  customerId: string;
}
