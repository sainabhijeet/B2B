import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ThemePreviewImage } from './theme-preview-image.entity';

/** `WEB` = storefront bundle path; `MOBILE` = app shell bundle path. */
export type ThemeChannel = 'WEB' | 'MOBILE';

@Entity({ name: 'themes' })
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Folder key, e.g. `jewellery-web` → `storefront-web/themes/jewellery-web`. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  slug: string | null;

  @Column({
    name: 'theme_channel',
    type: 'varchar',
    length: 16,
    default: 'WEB',
  })
  themeChannel: ThemeChannel;

  @Column({ name: 'theme_name', type: 'varchar', length: 128 })
  themeName: string;

  @Column({ name: 'theme_type', type: 'varchar', length: 64 })
  themeType: string;

  @Column({ name: 'theme_config_json', type: 'jsonb' })
  themeConfigJson: Record<string, unknown>;

  @Column({
    name: 'preview_image',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  previewImage: string | null;

  /** Internal: relative path under the API storage root (ZIP extract). Not returned in public JSON — clients use `manifestPath` only. */
  @Column({
    name: 'storage_path',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  storagePath: string | null;

  @Column({
    name: 'theme_version',
    type: 'varchar',
    length: 32,
    default: '1.0',
  })
  themeVersion: string;

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: string;

  @OneToMany(() => ThemePreviewImage, (img) => img.theme)
  previewImages?: ThemePreviewImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
