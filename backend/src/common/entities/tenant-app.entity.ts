import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tenant_apps' })
export class TenantDistributorApp {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'app_name', type: 'varchar', length: 255, default: '' })
  appName: string;

  @Column({ name: 'package_name', type: 'varchar', length: 255, default: '' })
  packageName: string;

  @Column({ name: 'splash_screen', type: 'varchar', length: 64, nullable: true })
  splashScreen: string | null;

  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl: string | null;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
