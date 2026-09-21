import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewTranslationDto {
  @IsIn(['APPROVED', 'REJECTED']) decision: 'APPROVED' | 'REJECTED';
  @IsString() @MaxLength(10000) translationText: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
