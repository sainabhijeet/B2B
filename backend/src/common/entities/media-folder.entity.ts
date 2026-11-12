import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export type MediaFolderOwnershipType = 'PLATFORM' | 'TENANT';

@Entity({ name: 'media_folders' })
@Check(
  'CHK_media_folders_owner_scope',
  `(("ownership_type" = 'PLATFORM' AND "tenant_id" IS NULL) OR ("ownership_type" = 'TENANT' AND "tenant_id" IS NOT NULL))`,
)
@Check(
  'CHK_media_folders_ownership_type',
  `"ownership_type" IN ('PLATFORM', 'TENANT')`,
)
@Check(
  'CHK_media_folders_name_safe',
  `"name" <> '' AND "name" !~ '[\\x00-\\x1F\\x7F]' AND "name" NOT IN ('.', '..') AND "name" NOT LIKE '%/%' AND "name" NOT LIKE '%\\%'`,
)
@Check(
  'CHK_media_folders_not_self_parent',
  `"parent_id" IS NULL OR "parent_id" <> "id"`,
)
@Index('IDX_media_folders_parent', ['parentId'])
@Index('IDX_media_folders_owner_parent', [
  'ownershipType',
  'tenantId',
  'parentId',
])
export class MediaFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => MediaFolder, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id' })
  parent: MediaFolder | null;

  @OneToMany(() => MediaFolder, (folder) => folder.parent)
  children: MediaFolder[];

  @Column({ name: 'ownership_type', type: 'varchar', length: 16 })
  ownershipType: MediaFolderOwnershipType;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
