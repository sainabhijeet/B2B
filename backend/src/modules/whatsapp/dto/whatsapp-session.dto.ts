import type { Customer } from '../../../common/entities/customer.entity';
import type { CustomerWhatsappPermission } from '../../../common/entities/customer-whatsapp-permission.entity';
import type { TempCustomer } from '../../../common/entities/temp-customer.entity';
import type { WhatsappOrderSession } from '../entities/whatsapp-order-session.entity';
import type { WhatsappIntent } from '../whatsapp-intent.util';

/** Input to `WhatsappOrderFlowService.handleMessage` (plain-text state machine). */
export type WhatsappFlowHandleMessageInput = {
  session: WhatsappOrderSession;
  text: string;
  tenantId: string;
  phoneNumberId: string;
  intent: WhatsappIntent;
  /** True when customer may use quick-order flows (place and/or repeat). */
  canUseShop: boolean;
  /** Used for interactive main menu (help) and menu-choice gates. */
  perm: CustomerWhatsappPermission | null;
  /** Registered retailer; null while only a {@link tempCustomer} exists. */
  customer: Customer | null;
  /** Provisional WhatsApp lead until first order confirm; null when {@link customer} is set. */
  tempCustomer: TempCustomer | null;
  /** `customers.id` when known; null for provisional temp leads. */
  realCustomerId: string | null;
};
