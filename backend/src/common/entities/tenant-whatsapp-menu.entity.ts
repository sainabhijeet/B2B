import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'tenant_whatsapp_menu' })
@Index('idx_tenant_whatsapp_menu_tenant_position', ['tenantId', 'position'])
@Index('UQ_tenant_whatsapp_menu_tenant_key', ['tenantId', 'menuKey'], { unique: true })
export class TenantWhatsappMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'menu_key', type: 'varchar', length: 24 })
  menuKey: string;

  @Column({ type: 'varchar', length: 64 })
  label: string;

  @Column({ type: 'int' })
  position: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
