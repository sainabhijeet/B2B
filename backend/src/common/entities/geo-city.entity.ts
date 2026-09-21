import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GeoState } from './geo-state.entity';

@Entity({ name: 'geo_cities' })
@Index('UQ_geo_cities_state_name', ['stateId', 'name'], { unique: true })
@Index('idx_geo_cities_state', ['stateId'])
export class GeoCity {
  @PrimaryGeneratedColumn('uuid', { name: 'city_id' })
  cityId: string;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId: string;

  @ManyToOne(() => GeoState, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'state_id' })
  state: GeoState;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
