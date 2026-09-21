import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tenant_domains' })
export class TenantDomain {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    name: 'domain_type',
    type: 'varchar',
    length: 32,
    default: 'subdomain',
  })
  domainType: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  subdomain: string | null;

  @Column({
    name: 'custom_domain',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customDomain: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
