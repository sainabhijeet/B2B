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
import { ThemeBundle } from './theme-bundle.entity';
import { ThemeRelease } from './theme-release.entity';

export type CanonicalThemeDeploymentEnvironment = 'PRODUCTION' | 'PREVIEW';
export type CanonicalThemeDeploymentStatus =
  | 'ACTIVE'
  | 'ROLLED_BACK'
  | 'ARCHIVED';

@Entity({ name: 'theme_deployments' })
@Index(['tenantId', 'environment'])
@Index(['webReleaseId'])
@Index(['mobileReleaseId'])
@Index(['bundleId'])
@Index(['legacyTenantThemeId'], {
  unique: true,
  where: '"legacy_tenant_theme_id" IS NOT NULL',
})
export class ThemeDeployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 32, default: 'PRODUCTION' })
  environment: CanonicalThemeDeploymentEnvironment;

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: CanonicalThemeDeploymentStatus;

  @Column({ name: 'web_release_id', type: 'uuid' })
  webReleaseId: string;

  @ManyToOne(() => ThemeRelease, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'web_release_id' })
  webRelease: ThemeRelease;

  @Column({ name: 'mobile_release_id', type: 'uuid', nullable: true })
  mobileReleaseId: string | null;

  @ManyToOne(() => ThemeRelease, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'mobile_release_id' })
  mobileRelease: ThemeRelease | null;

  @Column({ name: 'bundle_id', type: 'uuid', nullable: true })
  bundleId: string | null;

  @ManyToOne(() => ThemeBundle, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'bundle_id' })
  bundle: ThemeBundle | null;

  @Column({ name: 'legacy_tenant_theme_id', type: 'uuid', nullable: true })
  legacyTenantThemeId: string | null;

  @Column({
    name: 'legacy_tenant_theme_settings_tenant_id',
    type: 'uuid',
    nullable: true,
  })
  /** `tenant_theme_settings` uses tenant_id as its primary key. */
  legacyTenantThemeSettingsTenantId: string | null;

  @Column({ name: 'source', type: 'varchar', length: 32, default: 'BACKFILL' })
  source: string;

  @Column({ name: 'deployed_at', type: 'timestamptz', nullable: true })
  deployedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
