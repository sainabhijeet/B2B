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
import { User } from './user.entity';

/**
 * Append-only log when a tenant switches storefront theme (web / mobile / combo).
 * Theme UUIDs are stored without FK to `themes` so catalog rows can be removed without losing history.
 */
@Entity({ name: 'tenant_theme_changes' })
@Index(['tenantId', 'createdAt'])
export class TenantThemeChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'previous_web_theme_id', type: 'uuid', nullable: true })
  previousWebThemeId: string | null;

  @Column({ name: 'new_web_theme_id', type: 'uuid' })
  newWebThemeId: string;

  @Column({ name: 'previous_mobile_theme_id', type: 'uuid', nullable: true })
  previousMobileThemeId: string | null;

  @Column({ name: 'new_mobile_theme_id', type: 'uuid', nullable: true })
  newMobileThemeId: string | null;

  @Column({ name: 'previous_combo_id', type: 'uuid', nullable: true })
  previousComboId: string | null;

  @Column({ name: 'new_combo_id', type: 'uuid', nullable: true })
  newComboId: string | null;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
