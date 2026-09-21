import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

/** Central library: Meta message templates keyed by WABA (not tenant-scoped). */
@Entity({ name: 'platform_whatsapp_meta_templates' })
@Index('UQ_platform_whatsapp_meta_templates_waba_name_lang', ['wabaId', 'templateName', 'language'], {
  unique: true,
})
export class PlatformWhatsappMetaTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'waba_id', type: 'varchar', length: 128 })
  wabaId: string;

  @Column({ name: 'template_name', type: 'varchar', length: 128 })
  templateName: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'en' })
  language: string;

  @Column({ name: 'components_json', type: 'jsonb', nullable: true })
  componentsJson: unknown[] | Record<string, unknown> | null;

  /** Last tenant line used to sync this WABA row (audit only). */
  @Column({ name: 'source_tenant_id', type: 'uuid', nullable: true })
  sourceTenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_tenant_id' })
  sourceTenant?: Tenant | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
