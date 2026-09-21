import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'theme_legacy_mappings' })
@Index(['legacyEntity', 'legacyId', 'canonicalEntity'], { unique: true })
@Index(['canonicalEntity', 'canonicalId'])
export class ThemeLegacyMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legacy_entity', type: 'varchar', length: 64 })
  legacyEntity: string;

  @Column({ name: 'legacy_id', type: 'uuid' })
  legacyId: string;

  @Column({ name: 'canonical_entity', type: 'varchar', length: 64 })
  canonicalEntity: string;

  @Column({ name: 'canonical_id', type: 'uuid' })
  canonicalId: string;

  @Column({ name: 'source_table', type: 'varchar', length: 128 })
  sourceTable: string;

  @Column({
    name: 'source_version',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  sourceVersion: string | null;

  @Column({ name: 'source_hash', type: 'char', length: 64, nullable: true })
  sourceHash: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
