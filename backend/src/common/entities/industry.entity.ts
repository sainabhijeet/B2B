import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'industries' })
@Index('IDX_industries_status_order', ['status', 'displayOrder'])
export class Industry {
  @PrimaryGeneratedColumn('uuid', { name: 'industry_id' })
  industryId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  /** Lucide icon component name (e.g. Cpu, Store) — same key used in admin + distributor UIs. */
  @Column({ type: 'varchar', length: 64, default: 'Box' })
  icon: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
