import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'plans' })
@Index(['code'], { unique: true })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 16, default: 'YEARLY' })
  billingCycle: 'MONTHLY' | 'YEARLY';

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, unknown> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Tenant, (t) => t.plan)
  tenants: Tenant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
