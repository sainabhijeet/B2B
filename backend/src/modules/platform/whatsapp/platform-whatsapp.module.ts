import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformWhatsappMetaTemplate } from '../../../common/entities/platform-whatsapp-meta-template.entity';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import { Tenant } from '../../../common/entities/tenant.entity';
import { TenantWhatsappMetaTemplate } from '../../whatsapp/entities/tenant-whatsapp-meta-template.entity';
import { WhatsappModule } from '../../whatsapp/whatsapp.module';
import { PlatformWhatsappController } from './platform-whatsapp.controller';
import { PlatformWhatsappMetaTemplateSyncService } from './platform-whatsapp-meta-template-sync.service';
import { PlatformWhatsappService } from './platform-whatsapp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformWhatsappNumber,
      PlatformWhatsappMetaTemplate,
      Tenant,
      TenantWhatsappMetaTemplate,
    ]),
    WhatsappModule,
  ],
  controllers: [PlatformWhatsappController],
  providers: [PlatformWhatsappMetaTemplateSyncService, PlatformWhatsappService],
})
export class PlatformWhatsappModule {}
