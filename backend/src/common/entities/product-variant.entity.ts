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
import { Product } from './product.entity';

@Entity({ name: 'product_variants' })
@Index('idx_product_variants_sku_unique', ['variantSku'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'variant_sku', type: 'varchar', length: 128 })
  variantSku: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  mrp: string;

  /** Minimum order quantity for this variant (default 1). */
  @Column({ type: 'int', default: 1 })
  moq: number;

  /** GST % for this variant; when null, catalog falls back to `products.tax_rate`. */
  @Column({ name: 'gst_rate', type: 'numeric', precision: 5, scale: 2, nullable: true })
  gstRate: string | null;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ name: 'attributes_json', type: 'jsonb', default: {} })
  attributesJson: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
