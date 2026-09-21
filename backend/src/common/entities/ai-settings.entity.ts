import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Singleton row `id = default` — platform AI branding limits (super admin). */
@Entity({ name: 'ai_settings' })
export class AiSettings {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id: string;

  /** How many color palettes OpenAI returns per request. */
  @Column({ name: 'color_palettes', type: 'int' })
  colorPalettes: number;

  /** How many tagline options per request. */
  @Column({ name: 'tagline_suggestions', type: 'int' })
  taglineSuggestions: number;

  /** Logos generated per “Generate” click (DALL·E calls per batch). */
  @Column({ name: 'logo_generation_limit', type: 'int' })
  logoGenerationLimit: number;

  /** Max AI logo batches per tenant (each batch = logo_generation_limit images). */
  @Column({ name: 'max_logo_batches_per_tenant', type: 'int' })
  maxLogoBatchesPerTenant: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
