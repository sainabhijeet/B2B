import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListMasterBrandsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}
