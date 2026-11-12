import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'store_release_settings' })
@Index(['tenantId', 'platform', 'packageNameOrBundleId'], { unique: true })
export class StoreReleaseSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 16 })
  platform: 'ANDROID' | 'IOS';

  @Column({ name: 'package_name_or_bundle_id', type: 'varchar', length: 255 })
  packageNameOrBundleId: string;

  @Column({
    name: 'release_track',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  releaseTrack: string | null;

  @Column({
    name: 'credential_status',
    type: 'varchar',
    length: 32,
    default: 'NOT_CONFIGURED',
  })
  credentialStatus: 'NOT_CONFIGURED' | 'CONFIGURED';

  @Column({ name: 'encrypted_credentials', type: 'text', nullable: true })
  encryptedCredentials: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
