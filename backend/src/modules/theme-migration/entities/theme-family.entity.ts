import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ThemeRelease } from './theme-release.entity';

export type CanonicalThemeFamilyStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

@Entity({ name: 'theme_families' })
@Index(['slug'], { unique: true })
export class ThemeFamily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  slug: string;

  @Column({ name: 'display_name', type: 'varchar', length: 160 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: CanonicalThemeFamilyStatus;

  @Column({
    name: 'metadata_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadataJson: Record<string, unknown>;

  @OneToMany(() => ThemeRelease, (release) => release.themeFamily)
  releases: ThemeRelease[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
