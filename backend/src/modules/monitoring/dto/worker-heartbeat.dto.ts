import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class WorkerHeartbeatDto {
  @IsString()
  @MaxLength(128)
  hostname: string;

  @IsOptional()
  @IsIn(['ONLINE', 'OFFLINE', 'BUSY'])
  status?: 'ONLINE' | 'OFFLINE' | 'BUSY';

  @IsInt()
  @Min(0)
  activeJobs: number;
}
