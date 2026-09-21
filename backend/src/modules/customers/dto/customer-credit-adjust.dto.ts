import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

export class CustomerCreditAdjustDto {
  @ApiProperty({ enum: ['ADJUSTMENT_DEBIT', 'ADJUSTMENT_CREDIT'] })
  @IsIn(['ADJUSTMENT_DEBIT', 'ADJUSTMENT_CREDIT'])
  entryType!: 'ADJUSTMENT_DEBIT' | 'ADJUSTMENT_CREDIT';

  @ApiProperty({ description: 'Positive decimal; debit increases outstanding, credit reduces it.' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'magnitude must be a positive decimal string' })
  magnitude!: string;
}
