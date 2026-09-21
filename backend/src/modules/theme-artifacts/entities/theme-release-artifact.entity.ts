import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Theme } from '../../../common/entities/theme.entity';
import { ThemeRelease } from '../../theme-migration/entities/theme-release.entity';

export type ThemeArtifactType = 'ZIP';
export type ThemeArtifactProvider = 'S3_COMPATIBLE';

/** Immutable, verified object-storage metadata. Runtime never reads this row in Phase 2. */
@Entity({ name: 'theme_release_artifacts' })
@Index(['legacyThemeId', 'artifactType'], { unique: true })
@Index(['themeReleaseId', 'artifactType'], {
  unique: true,
  where: '"theme_release_id" IS NOT NULL',
})
@Index(['objectKey'], { unique: true })
@Index(['sha256'])
export class ThemeReleaseArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'theme_release_id', type: 'uuid', nullable: true })
  themeReleaseId: string | null;

  @ManyToOne(() => ThemeRelease, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'theme_release_id' })
  themeRelease: ThemeRelease | null;

  @Column({ name: 'legacy_theme_id', type: 'uuid' })
  legacyThemeId: string;

  @ManyToOne(() => Theme, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'legacy_theme_id' })
  legacyTheme: Theme;

  @Column({
    name: 'artifact_type',
    type: 'varchar',
    length: 32,
    default: 'ZIP',
  })
  artifactType: ThemeArtifactType;

  @Column({ name: 'storage_provider', type: 'varchar', length: 32 })
  storageProvider: ThemeArtifactProvider;

  @Column({ name: 'bucket_name', type: 'varchar', length: 255 })
  bucketName: string;

  @Column({ name: 'object_key', type: 'varchar', length: 512 })
  objectKey: string;

  @Column({ name: 'sha256', type: 'char', length: 64 })
  sha256: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ name: 'content_type', type: 'varchar', length: 128 })
  contentType: string;

  @Column({ name: 'etag', type: 'varchar', length: 256, nullable: true })
  etag: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz' })
  verifiedAt: Date;

  @Column({
    name: 'metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadataJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
