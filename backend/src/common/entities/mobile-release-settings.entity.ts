import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'mobile_release_settings' })
@Index(['tenantId'], { unique: true })
export class MobileReleaseSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'google_package_name', type: 'varchar', length: 255, nullable: true })
  googlePackageName: string | null;

  @Column({ name: 'google_service_account_json_encrypted', type: 'text', nullable: true })
  googleServiceAccountJsonEncrypted: string | null;

  @Column({ name: 'google_default_track', type: 'varchar', length: 32, default: 'internal' })
  googleDefaultTrack: 'internal' | 'alpha' | 'beta' | 'production';

  @Column({ name: 'google_release_notes_template', type: 'text', nullable: true })
  googleReleaseNotesTemplate: string | null;

  @Column({ name: 'apple_bundle_identifier', type: 'varchar', length: 255, nullable: true })
  appleBundleIdentifier: string | null;

  @Column({ name: 'apple_issuer_id', type: 'varchar', length: 128, nullable: true })
  appleIssuerId: string | null;

  @Column({ name: 'apple_key_id', type: 'varchar', length: 128, nullable: true })
  appleKeyId: string | null;

  @Column({ name: 'apple_api_key_encrypted', type: 'text', nullable: true })
  appleApiKeyEncrypted: string | null;

  @Column({ name: 'apple_team_id', type: 'varchar', length: 128, nullable: true })
  appleTeamId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
