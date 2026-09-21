import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Theme } from './theme.entity';
import { ThemeComboMapping } from './theme-combo-mapping.entity';

@Entity({ name: 'tenant_theme_settings' })
export class TenantThemeSettings {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'web_theme_id', type: 'uuid' })
  webThemeId: string;

  @ManyToOne(() => Theme, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'web_theme_id' })
  webTheme: Theme;

  @Column({ name: 'mobile_theme_id', type: 'uuid', nullable: true })
  mobileThemeId: string | null;

  @ManyToOne(() => Theme, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mobile_theme_id' })
  mobileTheme: Theme | null;

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  primaryColor: string | null;

  @Column({
    name: 'secondary_color',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  secondaryColor: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'combo_id', type: 'uuid', nullable: true })
  comboId: string | null;

  @ManyToOne(() => ThemeComboMapping, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'combo_id' })
  combo: ThemeComboMapping | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
