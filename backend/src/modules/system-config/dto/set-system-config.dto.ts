import { IsOptional, IsString } from 'class-validator';

export class SetSystemConfigDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  value?: string;
}
