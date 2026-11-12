import { IsIn } from 'class-validator';

export class UpdateStoreReleaseStatusDto {
  @IsIn(['QUEUED', 'CANCELLED'])
  status: 'QUEUED' | 'CANCELLED';
}
