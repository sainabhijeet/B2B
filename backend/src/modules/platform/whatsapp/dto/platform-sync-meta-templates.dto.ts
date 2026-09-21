import { Transform } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class PlatformSyncMetaTemplatesDto {
  @Transform(({ value, obj }: { value?: string; obj?: Record<string, unknown> }) => {
    const o = obj?.tenant_id ?? obj?.tenantId;
    return (typeof value === 'string' ? value : undefined) ?? (typeof o === 'string' ? o : undefined);
  })
  @IsUUID('4')
  tenantId: string;
}
