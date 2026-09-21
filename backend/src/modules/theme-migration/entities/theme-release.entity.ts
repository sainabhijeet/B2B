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
import { ThemeFamily } from './theme-family.entity';

export type CanonicalThemeReleaseChannel = 'WEB' | 'MOBILE';
export type CanonicalThemeReleaseStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'DEPRECATED'
  | 'ARCHIVED';

@Entity({ name: 'theme_releases' })
@Index(['themeFamilyId', 'channel', 'version'], { unique: true })
@Index(['channel', 'status'])
@Index(['legacyThemeId'], {
  unique: true,
  where: '"legacy_theme_id" IS NOT NULL',
})
export class ThemeRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'theme_family_id', type: 'uuid' })
  themeFamilyId: string;

  @ManyToOne(() => ThemeFamily, (family) => family.releases, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'theme_family_id' })
  themeFamily: ThemeFamily;

  @Column({ type: 'varchar', length: 16 })
  channel: CanonicalThemeReleaseChannel;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ type: 'varchar', length: 32, default: 'PUBLISHED' })
  status: CanonicalThemeReleaseStatus;

  @Column({
    name: 'manifest_version',
    type: 'varchar',
    length: 32,
    default: '1',
  })
  manifestVersion: string;

  @Column({
    name: 'manifest_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  manifestJson: Record<string, unknown>;

  @Column({ name: 'storage_key', type: 'varchar', length: 512, nullable: true })
  storageKey: string | null;

  @Column({ name: 'archive_key', type: 'varchar', length: 512, nullable: true })
  archiveKey: string | null;

  @Column({ name: 'package_sha256', type: 'char', length: 64, nullable: true })
  packageSha256: string | null;

  @Column({ name: 'package_size_bytes', type: 'bigint', nullable: true })
  packageSizeBytes: string | null;

  @Column({ name: 'legacy_theme_id', type: 'uuid', nullable: true })
  legacyThemeId: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
