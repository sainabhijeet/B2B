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
import { ThemeRelease } from './theme-release.entity';

export type CanonicalThemeBundleStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

@Entity({ name: 'theme_bundles' })
@Index(['webReleaseId', 'mobileReleaseId'])
@Index(['legacyComboId'], {
  unique: true,
  where: '"legacy_combo_id" IS NOT NULL',
})
export class ThemeBundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: CanonicalThemeBundleStatus;

  @Column({ name: 'web_release_id', type: 'uuid' })
  webReleaseId: string;

  @ManyToOne(() => ThemeRelease, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'web_release_id' })
  webRelease: ThemeRelease;

  @Column({ name: 'mobile_release_id', type: 'uuid' })
  mobileReleaseId: string;

  @ManyToOne(() => ThemeRelease, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mobile_release_id' })
  mobileRelease: ThemeRelease;

  @Column({
    name: 'preview_image',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  previewImage: string | null;

  @Column({ name: 'legacy_combo_id', type: 'uuid', nullable: true })
  legacyComboId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
