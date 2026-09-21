import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttributeValue } from './attribute-value.entity';
import { ProductVariant } from './product-variant.entity';

/**
 * Normalized variant ↔ attribute value (Shopify-style facet IDs).
 * Kept in sync (best-effort) from `product_variants.attributes_json` on variant writes.
 */
@Entity({ name: 'product_variant_attribute_values' })
@Index('IDX_pvav_variant_id', ['productVariantId'])
@Index('IDX_pvav_attribute_value_id', ['attributeValueId'])
export class ProductVariantAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  variant: ProductVariant;

  @Column({ name: 'attribute_value_id', type: 'uuid' })
  attributeValueId: string;

  @ManyToOne(() => AttributeValue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_value_id' })
  attributeValue: AttributeValue;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
