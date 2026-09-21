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
import { GeoCity } from './geo-city.entity';

@Entity({ name: 'geo_pincodes' })
@Index('UQ_geo_pincodes_city_code', ['cityId', 'code'], { unique: true })
@Index('idx_geo_pincodes_city', ['cityId'])
export class GeoPincode {
  @PrimaryGeneratedColumn('uuid', { name: 'pincode_id' })
  pincodeId: string;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId: string;

  @ManyToOne(() => GeoCity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city: GeoCity;

  /** Postal / ZIP — format varies by country */
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
