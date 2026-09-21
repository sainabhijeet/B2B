import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'translations' })
@Index(['tenantId', 'languageCode', 'translationKey'], { unique: true })
export class Translation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'language_code', type: 'varchar', length: 16 })
  languageCode: string;

  @Column({ name: 'translation_key', type: 'varchar', length: 255 })
  translationKey: string;

  @Column({ name: 'translation_value', type: 'text' })
  translationValue: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
