import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

const upper = ({ value }: { value: unknown }) => String(value ?? '').trim().toUpperCase();
const trimmed = ({ value }: { value: unknown }) => String(value ?? '').trim();

export class CreateOrderRequestDto {
  @Transform(upper)
  @IsIn(['REPLACEMENT', 'CANCEL'])
  type: 'REPLACEMENT' | 'CANCEL';

  @Transform(upper)
  @IsString()
  @IsIn([
    'DAMAGED_PRODUCT',
    'DEFECTIVE_PRODUCT',
    'WRONG_ITEM_RECEIVED',
    'MISSING_ITEM',
    'ORDERED_BY_MISTAKE',
    'WRONG_QUANTITY',
    'DUPLICATE_ORDER',
    'PRICE_ISSUE',
    'OTHER',
  ])
  reason: string;

  @Transform(trimmed)
  @ValidateIf((dto: CreateOrderRequestDto) => dto.type === 'REPLACEMENT')
  @IsString()
  @Length(5, 1000)
  description?: string;

  @Transform(trimmed)
  @ValidateIf((dto: CreateOrderRequestDto) => dto.type === 'CANCEL' && dto.note != null && dto.note !== '')
  @IsString()
  @Length(1, 500)
  note?: string;
}

export class ReviewOrderRequestDto {
  @Transform(upper)
  @IsIn(['START_REVIEW', 'APPROVE', 'REJECT', 'MARK_SHIPPED', 'COMPLETE'])
  action: 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'MARK_SHIPPED' | 'COMPLETE';

  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @Length(3, 500)
  note?: string;
}
