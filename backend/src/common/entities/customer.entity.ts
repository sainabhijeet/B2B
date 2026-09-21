import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerStatus } from '../enums/customer-status.enum';
import { Tenant } from './tenant.entity';
import { CustomerAddress } from './customer-address.entity';

@Entity({ name: 'customers' })
@Index('idx_customers_tenant_mobile_unique', ['tenantId', 'mobile'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** National mobile digits (and optional leading country digits), normalized at API layer. */
  @Column({ type: 'varchar', length: 20 })
  mobile: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'profile_image_url', type: 'varchar', length: 512, nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'varchar', length: 16, default: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  /** Maximum outstanding (credit_balance + new orders) allowed. */
  @Column({ name: 'credit_limit', type: 'numeric', precision: 14, scale: 2, default: 0 })
  creditLimit: string;

  /** Current outstanding owed by the customer. */
  @Column({ name: 'credit_balance', type: 'numeric', precision: 14, scale: 2, default: 0 })
  creditBalance: string;

  @Column({ name: 'business_legal_name', type: 'varchar', length: 512, nullable: true })
  businessLegalName: string | null;

  @Column({ name: 'gstin', type: 'varchar', length: 32, nullable: true })
  gstin: string | null;

  @Column({ name: 'gst_verified', type: 'boolean', default: false })
  gstVerified: boolean;

  @Column({ name: 'gst_status', type: 'varchar', length: 64, nullable: true })
  gstStatus: string | null;

  @Column({ name: 'gst_certificate_url', type: 'varchar', length: 512, nullable: true })
  gstCertificateUrl: string | null;

  @Column({ name: 'gst_certificate_file_name', type: 'varchar', length: 255, nullable: true })
  gstCertificateFileName: string | null;

  @Column({ name: 'gst_verified_at', type: 'timestamptz', nullable: true })
  gstVerifiedAt: Date | null;

  @OneToMany(() => CustomerAddress, (a) => a.customer)
  addresses: CustomerAddress[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
