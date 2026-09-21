import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'plan_limits' })
@Index(['planName'], { unique: true })
export class PlanLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 32 })
  planName: string;

  @Column({ name: 'max_products', type: 'int', default: 0 })
  maxProducts: number;

  @Column({ name: 'max_users', type: 'int', default: 0 })
  maxUsers: number;

  @Column({ name: 'max_attributes', type: 'int', default: 0 })
  maxAttributes: number;

  @Column({ name: 'max_images_per_product', type: 'int', default: 0 })
  maxImagesPerProduct: number;

  @Column({ name: 'notifications_per_day', type: 'int', default: 0 })
  notificationsPerDay: number;

  @Column({ name: 'build_priority', type: 'varchar', length: 16, default: 'LOW' })
  buildPriority: string;

  @Column({ name: 'ads_enabled', type: 'boolean', default: true })
  adsEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
