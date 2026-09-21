import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Theme } from './theme.entity';

/** Virtual “pack”: one web theme + one mobile theme (distributor wizard combo option). */
@Entity({ name: 'theme_combo_mapping' })
export class ThemeComboMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'web_theme_id', type: 'uuid' })
  webThemeId: string;

  @ManyToOne(() => Theme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'web_theme_id' })
  webTheme: Theme;

  @Column({ name: 'mobile_theme_id', type: 'uuid' })
  mobileThemeId: string;

  @ManyToOne(() => Theme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mobile_theme_id' })
  mobileTheme: Theme;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({
    name: 'preview_image',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  previewImage: string | null;

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
