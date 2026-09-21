import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Industry } from './industry.entity';

@Entity({ name: 'master_brands' })
export class MasterBrand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 512, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'industry_id', type: 'uuid', nullable: true })
  industryId: string | null;

  @ManyToOne(() => Industry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'industry_id', referencedColumnName: 'industryId' })
  industry: Industry | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
