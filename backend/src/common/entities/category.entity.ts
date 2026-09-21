import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Industry } from './industry.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'categories' })
@Index('idx_categories_tenant_slug_unique', ['tenantId', 'slug'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  /** Optional platform industry (templates, analytics, attribute scoping). */
  @Column({ name: 'industry_id', type: 'uuid', nullable: true })
  industryId: string | null;

  @ManyToOne(() => Industry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'industry_id', referencedColumnName: 'industryId' })
  industry: Industry | null;

  /** Tree depth: 1 = root. */
  @Column({ name: 'level', type: 'smallint', default: 1 })
  level: number;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl: string | null;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'show_in_app', type: 'boolean', default: true })
  showInApp: boolean;

  @Column({ name: 'show_in_website', type: 'boolean', default: true })
  showInWebsite: boolean;

  @Column({ name: 'show_in_menu', type: 'boolean', default: true })
  showInMenu: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
