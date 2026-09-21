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

@Entity({ name: 'tenant_whatsapp_template_mapping' })
@Index('UQ_tenant_whatsapp_template_mapping_tenant_key', ['tenantId', 'templateKey'], { unique: true })
export class TenantWhatsappTemplateMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /** Logical key: ORDER_CONFIRM, OTP, … */
  @Column({ name: 'template_key', type: 'varchar', length: 64 })
  templateKey: string;

  /** Meta-registered template `name` for this tenant (from sync / Business Manager). */
  @Column({ name: 'meta_template_name', type: 'varchar', length: 128 })
  metaTemplateName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
