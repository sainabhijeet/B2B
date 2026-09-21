import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'whatsapp_message_templates' })
export class WhatsappMessageTemplate {
  @PrimaryColumn({ name: 'message_key', type: 'varchar', length: 64 })
  messageKey: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
