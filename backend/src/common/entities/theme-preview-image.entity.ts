import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Theme } from './theme.entity';

@Entity({ name: 'theme_preview_images' })
@Index(['themeId', 'sortOrder'], { unique: true })
export class ThemePreviewImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'theme_id', type: 'uuid' })
  themeId: string;

  @ManyToOne(() => Theme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theme_id' })
  theme: Theme;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
