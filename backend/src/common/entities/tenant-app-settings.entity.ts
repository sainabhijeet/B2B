import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Per-tenant mobile / storefront flags. FK to `tenants` exists in DB migration only (avoids TypeORM join quirks). */
@Entity({ name: 'tenant_app_settings' })
export class TenantAppSettings {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'allow_guest_access', type: 'boolean', default: false })
  allowGuestAccess: boolean;

  @Column({ name: 'show_prices_to_guest', type: 'boolean', default: false })
  showPricesToGuest: boolean;

  @Column({ name: 'allow_guest_cart', type: 'boolean', default: false })
  allowGuestCart: boolean;

  @Column({ name: 'enable_repeat_order', type: 'boolean', default: true })
  enableRepeatOrder: boolean;

  @Column({ name: 'enable_credit_view', type: 'boolean', default: true })
  enableCreditView: boolean;

  @Column({ name: 'enable_notifications', type: 'boolean', default: true })
  enableNotifications: boolean;

  @Column({
    name: 'default_home_layout',
    type: 'varchar',
    length: 16,
    default: 'grid',
  })
  defaultHomeLayout: string;

  @Column({ name: 'show_banner', type: 'boolean', default: true })
  showBanner: boolean;

  @Column({
    name: 'selected_language_code',
    type: 'varchar',
    length: 16,
    default: 'en',
  })
  selectedLanguageCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
