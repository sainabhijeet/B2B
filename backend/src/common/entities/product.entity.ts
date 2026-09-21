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
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'products' })
@Index('idx_products_tenant_sku_unique', ['tenantId', 'sku'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
@Index('idx_products_tenant_slug_unique', ['tenantId', 'slug'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'varchar', length: 128 })
  sku: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  mrp: string;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxRate: string;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: string;

  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ name: 'meta_keywords', type: 'varchar', length: 512, nullable: true })
  metaKeywords: string | null;

  @Column({ name: 'cost_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  costPrice: string | null;

  @Column({ name: 'tags', type: 'jsonb' })
  tags: string[];

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brandRef: Brand | null;

  /** Denormalized display / legacy free-text label. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  brand: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  weight: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dimensions: string | null;

  @Column({ name: 'hsn_code', type: 'varchar', length: 32, nullable: true })
  hsnCode: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
