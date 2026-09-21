import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'countries' })
@Index('idx_countries_status', ['status'])
export class Country {
  @PrimaryGeneratedColumn('uuid', { name: 'country_id' })
  countryId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** ISO 3166-1 alpha-2 (e.g. IN, US) */
  @Column({ name: 'iso_code', type: 'varchar', length: 2, unique: true })
  isoCode: string;

  /** International dial prefix, e.g. +91 */
  @Column({ name: 'phone_code', type: 'varchar', length: 16 })
  phoneCode: string;

  /** Min national digits (without country code); null = use platform default (5–14). */
  @Column({ name: 'phone_national_min', type: 'int', nullable: true })
  phoneNationalMin: number | null;

  /** Max national digits; null = use platform default (5–14). */
  @Column({ name: 'phone_national_max', type: 'int', nullable: true })
  phoneNationalMax: number | null;

  /** ISO 4217 */
  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ name: 'default_language', type: 'varchar', length: 32 })
  defaultLanguage: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone: string | null;

  @Column({ name: 'currency_symbol', type: 'varchar', length: 16, nullable: true })
  currencySymbol: string | null;

  @Column({ name: 'tax_system', type: 'varchar', length: 64, nullable: true })
  taxSystem: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
