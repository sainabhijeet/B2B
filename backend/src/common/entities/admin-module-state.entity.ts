import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'admin_module_states' })
export class AdminModuleState {
  @PrimaryColumn({ name: 'module_key', type: 'varchar', length: 64 })
  moduleKey: string;

  @Column({ type: 'jsonb' })
  payload: unknown;

  @VersionColumn({ type: 'integer' })
  version: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
