import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tenant_profiles' })
export class TenantProfile {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_name', type: 'varchar', length: 255, default: '' })
  businessName: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 255, default: '' })
  ownerName: string;

  @Column({ name: 'industry_id', type: 'uuid', nullable: true })
  industryId: string | null;

  @Column({ name: 'gst_number', type: 'varchar', length: 64, nullable: true })
  gstNumber: string | null;

  @Column({ name: 'gst_verified', type: 'boolean', default: false })
  gstVerified: boolean;

  @Column({ name: 'gst_legal_name', type: 'varchar', length: 512, nullable: true })
  gstLegalName: string | null;

  /** Jurisdiction state label from GST registry (not `geo_states.state_id`). */
  @Column({ name: 'gst_state', type: 'varchar', length: 255, nullable: true })
  gstState: string | null;

  @Column({ name: 'gst_status', type: 'varchar', length: 64, nullable: true })
  gstStatus: string | null;

  @Column({ name: 'country_id', type: 'uuid', nullable: true })
  countryId: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ name: 'city_id', type: 'uuid', nullable: true })
  cityId: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  pincode: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
