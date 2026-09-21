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
import { Tenant } from '../../../common/entities/tenant.entity';

@Entity({ name: 'tenant_whatsapp_meta_templates' })
@Index('UQ_tenant_whatsapp_meta_templates_tenant_name', ['tenantId', 'templateName'], { unique: true })
export class TenantWhatsappMetaTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /** Graph `template.name` (synced from Meta). */
  @Column({ name: 'template_name', type: 'varchar', length: 128 })
  templateName: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 32, default: 'APPROVED' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'en' })
  language: string;

  @Column({ name: 'components_json', type: 'jsonb', nullable: true })
  componentsJson: unknown[] | Record<string, unknown> | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
