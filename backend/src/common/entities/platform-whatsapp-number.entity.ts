import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'platform_whatsapp_numbers' })
export class PlatformWhatsappNumber {
  @PrimaryColumn({ name: 'phone_number_id', type: 'varchar', length: 64 })
  phoneNumberId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken: string | null;

  /** When true and `access_token` is set, outbound Graph calls use that token for this line; otherwise `WHATSAPP_SHARED_TOKEN` (or legacy `WHATSAPP_CLOUD_ACCESS_TOKEN`). */
  @Column({ name: 'use_own_token', type: 'boolean', default: false })
  useOwnToken: boolean;

  /** WhatsApp Business Account id (Graph `/{waba-id}/message_templates`). Set by platform when provisioning the line. */
  @Column({ name: 'whatsapp_business_account_id', type: 'varchar', length: 128, nullable: true })
  whatsappBusinessAccountId: string | null;

  /** Meta webhook verify token for this line when `use_own_token` (GET `hub.verify_token`). */
  @Column({ name: 'webhook_verify_token', type: 'text', nullable: true })
  webhookVerifyToken: string | null;

  /** When `use_own_token`, inbound `X-Hub-Signature-256` is verified with this value only (`.env` app secret is not used for that line). */
  @Column({ name: 'app_secret', type: 'text', nullable: true })
  appSecret: string | null;

  @Column({ name: 'webhook_verified', type: 'boolean', default: false })
  webhookVerified: boolean;

  @Column({ name: 'last_meta_sync_error', type: 'text', nullable: true })
  lastMetaSyncError: string | null;

  @Column({ name: 'last_meta_sync_at', type: 'timestamptz', nullable: true })
  lastMetaSyncAt: Date | null;

  @Column({ name: 'last_message_sent_at', type: 'timestamptz', nullable: true })
  lastMessageSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
