import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class PutFirebaseAdminDto {
  @ApiProperty({ example: 'my-gcp-project' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'firebase-adminsdk@my-gcp-project.iam.gserviceaccount.com' })
  @IsString()
  clientEmail: string;

  /** PEM private key; omit or empty to keep existing when updating other fields. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  privateKey?: string;

  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' })
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
