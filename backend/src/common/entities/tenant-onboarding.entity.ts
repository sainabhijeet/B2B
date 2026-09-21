import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type TenantOnboardingStatus = 'in_progress' | 'complete';

@Entity({ name: 'tenant_onboarding' })
export class TenantOnboarding {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'current_step', type: 'int', default: 1 })
  currentStep: number;

  @Column({ type: 'varchar', length: 32, default: 'in_progress' })
  status: TenantOnboardingStatus;

  @Column({ name: 'payload_json', type: 'jsonb', default: () => "'{}'" })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
