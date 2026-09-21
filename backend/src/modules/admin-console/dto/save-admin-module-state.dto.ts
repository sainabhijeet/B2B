import { Type } from 'class-transformer';
import { Allow, IsInt, IsOptional, Min } from 'class-validator';

export class SaveAdminModuleStateDto {
  @Allow()
  payload: unknown;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
