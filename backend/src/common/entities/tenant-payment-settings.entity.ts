import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

/**
 * Tenant/distributor receiving payment details shown to authenticated storefront
 * customers for manual UPI / bank-transfer payments.
 *
 * This is not platform payment-provider configuration and must not be used for
 * Razorpay/SaaS billing credentials.
 */
@Entity({ name: 'tenant_payment_settings' })
export class TenantPaymentSettings {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({
    name: 'account_holder_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  accountHolderName: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
  bankName: string | null;

  @Column({
    name: 'account_number_encrypted',
    type: 'text',
    nullable: true,
  })
  accountNumberEncrypted: string | null;

  @Column({
    name: 'account_number_last4',
    type: 'varchar',
    length: 4,
    nullable: true,
  })
  accountNumberLast4: string | null;

  @Column({ name: 'ifsc', type: 'varchar', length: 32, nullable: true })
  ifsc: string | null;

  @Column({ name: 'branch', type: 'varchar', length: 255, nullable: true })
  branch: string | null;

  @Column({ name: 'upi_id', type: 'varchar', length: 255, nullable: true })
  upiId: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
