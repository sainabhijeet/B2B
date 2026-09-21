import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerWhatsappPermission } from '../../common/entities/customer-whatsapp-permission.entity';
import { TempCustomer } from '../../common/entities/temp-customer.entity';
import { TenantWhatsappMenu } from '../../common/entities/tenant-whatsapp-menu.entity';
import { TenantWhatsappTemplateMapping } from './entities/tenant-whatsapp-template-mapping.entity';
import { TenantWhatsappMetaTemplate } from './entities/tenant-whatsapp-meta-template.entity';
import { TenantWhatsappTemplate } from '../../common/entities/tenant-whatsapp-template.entity';
import { PlatformWhatsappNumber } from '../../common/entities/platform-whatsapp-number.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { WhatsappMessageTemplate } from '../../common/entities/whatsapp-message-template.entity';
import { WhatsappMenuClick } from '../../common/entities/whatsapp-menu-click.entity';
import { WhatsappMessage } from './entities/whatsapp-message.entity';
import { WhatsappOrderSession } from './entities/whatsapp-order-session.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { ReorderSuggestionsModule } from '../reorder-suggestions/reorder-suggestions.module';
import { PlatformTenantWhatsappController } from './controllers/platform-tenant-whatsapp.controller';
import { DistributorWhatsappTemplateMappingController } from './controllers/distributor-whatsapp-template-mapping.controller';
import { DistributorWhatsappTemplateController } from './controllers/distributor-whatsapp-template.controller';
import { DistributorWhatsappMenuController } from './controllers/distributor-whatsapp-menu.controller';
import {
  WhatsappWebhookAliasController,
  WhatsappWebhookController,
} from './controllers/whatsapp-webhook.controller';
import { PlatformTenantWhatsappService } from './services/platform-tenant-whatsapp.service';
import { WhatsappWebhookVerifyService } from './services/whatsapp-webhook-verify.service';
import { WhatsappInboundService } from './services/whatsapp-inbound.service';
import { WhatsappOrderFlowService } from './services/whatsapp-order-flow.service';
import { WhatsappConversationWindowService } from './services/whatsapp-conversation-window.service';
import { WhatsappMetaTemplateSyncService } from './services/whatsapp-meta-template-sync.service';
import { WhatsappMenuService } from './services/whatsapp-menu.service';
import { WhatsappOrderSessionService } from './services/whatsapp-order-session.service';
import { WhatsappSenderService } from './services/whatsapp-sender.service';
import { WhatsappTemplateMappingService } from './services/whatsapp-template-mapping.service';
import { WhatsappTemplateResolverService } from './services/whatsapp-template-resolver.service';
import { WhatsappTempCustomerService } from './services/whatsapp-temp-customer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformWhatsappNumber,
      Tenant,
      Customer,
      CustomerWhatsappPermission,
      TempCustomer,
      TenantWhatsappMenu,
      TenantWhatsappTemplate,
      TenantWhatsappTemplateMapping,
      TenantWhatsappMetaTemplate,
      WhatsappMessage,
      WhatsappMenuClick,
      WhatsappMessageTemplate,
      WhatsappOrderSession,
    ]),
    OrdersModule,
    InvoicesModule,
    ProductsModule,
    ReorderSuggestionsModule,
    TenancyModule,
  ],
  controllers: [
    WhatsappWebhookController,
    WhatsappWebhookAliasController,
    PlatformTenantWhatsappController,
    DistributorWhatsappMenuController,
    DistributorWhatsappTemplateController,
    DistributorWhatsappTemplateMappingController,
  ],
  providers: [
    WhatsappTemplateMappingService,
    WhatsappMetaTemplateSyncService,
    WhatsappConversationWindowService,
    WhatsappTemplateResolverService,
    WhatsappSenderService,
    WhatsappOrderSessionService,
    WhatsappTempCustomerService,
    WhatsappMenuService,
    WhatsappOrderFlowService,
    WhatsappInboundService,
    WhatsappWebhookVerifyService,
    PlatformTenantWhatsappService,
  ],
  exports: [
    WhatsappTemplateMappingService,
    WhatsappInboundService,
    WhatsappConversationWindowService,
    WhatsappTemplateResolverService,
    WhatsappSenderService,
    WhatsappOrderFlowService,
    PlatformTenantWhatsappService,
    WhatsappMetaTemplateSyncService,
  ],
})
export class WhatsappModule {}
