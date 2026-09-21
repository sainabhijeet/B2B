import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tenant_branding' })
export class TenantBranding {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  /** Inline data URL from wizard until CDN upload exists. */
  @Column({ name: 'logo_data_url', type: 'text', nullable: true })
  logoDataUrl: string | null;

  /** AI logo batches used (max 5 per tenant in Phase-1). */
  @Column({ name: 'logo_generation_count', type: 'int', default: 0 })
  logoGenerationCount: number;

  @Column({ name: 'primary_color', type: 'varchar', length: 32, nullable: true })
  primaryColor: string | null;

  @Column({ name: 'secondary_color', type: 'varchar', length: 32, nullable: true })
  secondaryColor: string | null;

  @Column({ type: 'text', nullable: true })
  tagline: string | null;

  @Column({ name: 'theme_id', type: 'varchar', length: 64, nullable: true })
  themeId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
