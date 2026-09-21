import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantStatus } from '../enums/tenant-status.enum';
import { Plan } from './plan.entity';
import { User } from './user.entity';

@Entity({ name: 'tenants' })
@Index(['slug'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string | null;

  @ManyToOne(() => Plan, (p) => p.tenants, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan | null;

  /** Signup / registration country (e.g. distributor OTP country picker). FK → `countries`. */
  @Column({ name: 'country_id', type: 'uuid', nullable: true })
  countryId: string | null;

  /**
   * Dedicated Postgres schema for this tenant (`t_` + UUID without dashes).
   * Catalog data may still live in `public` with `tenant_id` until migrated.
   */
  @Column({ name: 'schema_name', type: 'varchar', length: 128 })
  schemaName: string;

  @Column({ name: 'tenant_schema_provisioned', type: 'boolean', default: false })
  tenantSchemaProvisioned: boolean;

  @OneToMany(() => User, (u) => u.tenant)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
