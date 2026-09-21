import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Customer } from '../../../common/entities/customer.entity';
import { CustomerWhatsappPermission } from '../../../common/entities/customer-whatsapp-permission.entity';
import { TempCustomer } from '../../../common/entities/temp-customer.entity';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';
import type { WhatsappOrderSession } from '../entities/whatsapp-order-session.entity';
import { WhatsappMessageTemplate } from '../../../common/entities/whatsapp-message-template.entity';
import { OrdersService } from '../../orders/orders.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { applyWhatsappTemplate } from '../whatsapp-template.util';
import {
  DEFAULT_HELP_COMMANDS,
  detectWhatsappIntent,
  type WhatsappIntent,
} from '../whatsapp-intent.util';
import {
  isWhatsappMenuKeyPermitted,
  WhatsappMenuService,
} from './whatsapp-menu.service';
import {
  isUnknownWhatsappMenuButtonId,
  parseWhatsappMenuButtonId,
  type WhatsappTenantMenuKey,
} from '../whatsapp-menu-key';
import { waFromToMobileCandidates } from '../whatsapp-phone.util';
import type { WaWebhookMessage, WaWebhookPayload } from '../whatsapp-webhook.types';
import type { WhatsappFlowReply } from '../dto/whatsapp-flow-reply.dto';
import { WhatsappSenderService } from './whatsapp-sender.service';
import { WaOrderState, WhatsappOrderFlowService } from './whatsapp-order-flow.service';
import { WhatsappOrderSessionService } from './whatsapp-order-session.service';
import { WhatsappTempCustomerService } from './whatsapp-temp-customer.service';
import { WhatsappConversationWindowService } from './whatsapp-conversation-window.service';
import type { WaSessionOwner } from '../whatsapp-session-owner.type';

function extractInboundUserText(msg: WaWebhookMessage): string | null {
  if (msg.type === 'text' && msg.text?.body?.trim()) {
    return msg.text.body.trim();
  }
  if (msg.type === 'interactive') {
    const id = msg.interactive?.button_reply?.id?.trim();
    if (id) return id;
    const title = msg.interactive?.button_reply?.title?.trim();
    if (title) return title;
  }
  return null;
}

@Injectable()
export class WhatsappInboundService {
  private readonly log = new Logger(WhatsappInboundService.name);

  constructor(
    @InjectRepository(PlatformWhatsappNumber)
    private readonly waNumberRepo: Repository<PlatformWhatsappNumber>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerWhatsappPermission)
    private readonly permRepo: Repository<CustomerWhatsappPermission>,
    @InjectRepository(WhatsappMessage)
    private readonly msgRepo: Repository<WhatsappMessage>,
    @InjectRepository(WhatsappMessageTemplate)
    private readonly tplRepo: Repository<WhatsappMessageTemplate>,
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
    private readonly sender: WhatsappSenderService,
    private readonly orderFlow: WhatsappOrderFlowService,
    private readonly sessionSvc: WhatsappOrderSessionService,
    private readonly tempWaCustomers: WhatsappTempCustomerService,
    private readonly waMenu: WhatsappMenuService,
    private readonly conversationWindow: WhatsappConversationWindowService,
    private readonly config: ConfigService,
  ) {}

  async handlePayload(payload: WaWebhookPayload): Promise<void> {
    this.log.log('WEBHOOK HIT');
    if (this.config.get<boolean>('whatsapp.logFullPayload', false)) {
      this.log.log(JSON.stringify(payload, null, 2));
    }

    const obj = payload?.object;
    if (obj && obj !== 'whatsapp_business_account') {
      this.log.warn(
        `Unexpected webhook object="${String(obj)}" (expected whatsapp_business_account); still parsing entries.`,
      );
    }

    const entries = payload.entry ?? [];
    if (entries.length === 0) {
      this.log.warn('WEBHOOK HIT but payload.entry is empty');
      return;
    }

    for (const entry of entries) {
      const changes = entry.changes ?? [];
      if (changes.length === 0) {
        this.log.log('entry has no changes[]');
        continue;
      }
      for (const ch of changes) {
        const fieldNorm = (ch.field ?? '').toLowerCase();
        if (fieldNorm && fieldNorm !== 'messages') {
          this.log.log(
            `Skipping change: field="${ch.field}" (only "messages" user events are handled)`,
          );
          continue;
        }

        const value = ch.value;
        if (!value) {
          this.log.log('Skipping change: value is missing');
          continue;
        }

        const phoneNumberIdRaw = value.metadata?.phone_number_id;
        const phoneNumberId =
          typeof phoneNumberIdRaw === 'string'
            ? phoneNumberIdRaw.trim()
            : phoneNumberIdRaw != null
              ? String(phoneNumberIdRaw).trim()
              : '';
        if (!phoneNumberId) {
          this.log.warn(
            'Webhook change missing value.metadata.phone_number_id (cannot resolve tenant or persist to whatsapp_messages).',
          );
          continue;
        }

        const mapping = await this.waNumberRepo.findOne({
          where: { phoneNumberId },
        });
        if (!mapping) {
          this.log.warn(
            `No platform_whatsapp_numbers row for phone_number_id=${phoneNumberId}. Add this Meta Phone number ID in Super Admin → tenant → WhatsApp.`,
          );
          continue;
        }
        if (!mapping.isActive) {
          this.log.warn(
            `WhatsApp disabled for tenant (is_active=false) phone_number_id=${phoneNumberId}`,
          );
          continue;
        }

        await this.waNumberRepo.update(
          { phoneNumberId },
          { webhookVerified: true },
        );

        const tenantId = mapping.tenantId;

        const hasStatuses =
          Array.isArray(value.statuses) && value.statuses.length > 0;
        const hasMessages =
          Array.isArray(value.messages) && value.messages.length > 0;

        if (hasStatuses && !hasMessages) {
          this.log.log('No message in payload (statuses-only delivery update)');
          await this.logMessage(tenantId, null, '[webhook:delivery-status]', 'IN', {
            kind: 'statuses_only',
            phone_number_id: phoneNumberId,
            statuses: value.statuses,
          });
          continue;
        }

        if (!hasMessages) {
          this.log.log(
            `No messages[] in change (keys on value: ${Object.keys(value).join(', ') || 'none'}); not a user message event`,
          );
          continue;
        }

        for (const msg of value.messages!) {
          this.log.log(`Raw message: type=${msg.type ?? '?'}`);

          if (msg.type !== 'text' && msg.type !== 'interactive') {
            if (msg.from) {
              const rawInbound = msg as unknown as Record<string, unknown>;
              await this.logMessage(
                tenantId,
                null,
                `[webhook:${msg.type ?? 'unknown'}]`,
                'IN',
                rawInbound,
              );
            }
            this.log.log(
              `Skipping message type="${msg.type ?? 'unknown'}" (only text and interactive replies are handled)`,
            );
            continue;
          }

          const text = extractInboundUserText(msg);
          const from = msg.from;
          if (!from) {
            this.log.log('Skipping message: missing from');
            continue;
          }
          if (!text) {
            const rawInbound = msg as unknown as Record<string, unknown>;
            await this.logMessage(
              tenantId,
              null,
              `[webhook:${msg.type}:no-text]`,
              'IN',
              rawInbound,
            );
            this.log.log('Skipping message: missing user text / button reply');
            continue;
          }

          this.log.log(`Incoming message from: ${from}`);
          this.log.log(`Message text: ${text}`);

          const rawInbound = msg as unknown as Record<string, unknown>;
          await this.handleInboundText({
            tenantId,
            phoneNumberId,
            from,
            text,
            rawInbound,
          });
        }
      }
    }
  }

  private async loadTemplate(key: string): Promise<string> {
    const row = await this.tplRepo.findOne({ where: { messageKey: key } });
    return row?.body ?? '';
  }

  private async render(
    key: string,
    vars: Record<string, string>,
  ): Promise<string> {
    const body = await this.loadTemplate(key);
    return applyWhatsappTemplate(body, vars);
  }

  private async logMessage(
    tenantId: string,
    customerId: string | null,
    message: string,
    direction: 'IN' | 'OUT',
    rawPayload?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      await this.msgRepo.save(
        this.msgRepo.create({
          tenantId,
          customerId,
          message,
          direction,
          rawPayload: rawPayload ?? null,
        }),
      );
      if (direction === 'IN' && customerId) {
        this.conversationWindow.invalidate(tenantId, customerId);
      }
    } catch (e) {
      this.log.error(
        `whatsapp_messages INSERT failed tenant_id=${tenantId} direction=${direction}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  private async reply(
    tenantId: string,
    customerId: string | null,
    phoneNumberId: string,
    to: string,
    text: string,
  ): Promise<void> {
    try {
      await this.sender.sendText(tenantId, to, text, phoneNumberId);
    } catch (e) {
      this.log.warn(
        `WhatsApp send failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    await this.logMessage(tenantId, customerId, text, 'OUT', {
      outbound: true,
      body: text,
    });
  }

  private async deliverFlowReply(
    tenantId: string,
    customerId: string | null,
    phoneNumberId: string,
    to: string,
    out: WhatsappFlowReply,
    sessionId?: string,
  ): Promise<void> {
    if (out.kind === 'text') {
      await this.reply(tenantId, customerId, phoneNumberId, to, out.body);
      return;
    }
    const summaryLabel = `${out.body}\n[${out.buttons.map((b) => b.title).join(' | ')}]`;
    try {
      await this.sender.sendButtons(tenantId, to, out.body, out.buttons, phoneNumberId);
      if (sessionId && out.contextPatch && Object.keys(out.contextPatch).length > 0) {
        await this.sessionSvc.updateContext(sessionId, out.contextPatch);
      }
    } catch (e) {
      this.log.warn(
        `WhatsApp buttons send failed: ${e instanceof Error ? e.message : String(e)}; falling back to text.`,
      );
      const fallback = [
        out.body,
        '',
        'Reply with:',
        ...out.buttons.map((b) => `• ${b.title} (or type: ${b.id})`),
      ].join('\n');
      await this.reply(tenantId, customerId, phoneNumberId, to, fallback);
      return;
    }
    await this.logMessage(tenantId, customerId, summaryLabel, 'OUT', {
      outbound: true,
      kind: 'buttons',
      buttons: out.buttons,
      body: out.body,
    });
  }

  private async findCustomer(
    tenantId: string,
    from: string,
  ): Promise<Customer | null> {
    const candidates = waFromToMobileCandidates(from);
    if (candidates.length === 0) return null;
    return this.customerRepo.findOne({
      where: { tenantId, mobile: In(candidates), deletedAt: IsNull() },
    });
  }

  /**
   * Provisional WhatsApp shoppers are not in `customers` yet; use permissive shop flags until
   * first order confirm (then {@link WhatsappTempCustomerService.promoteToCustomerForSession}).
   */
  private buildTempWhatsappPerm(tenantId: string, tempCustomerId: string): CustomerWhatsappPermission {
    const p = new CustomerWhatsappPermission();
    p.tenantId = tenantId;
    p.customerId = tempCustomerId;
    p.canViewStatus = false;
    p.canViewInvoice = false;
    p.canPlaceOrder = true;
    p.canRepeatOrder = false;
    p.canViewCredit = false;
    p.canReceiveBroadcast = false;
    return p;
  }

  /** Ensures a row exists (defaults: status + invoice on; commerce flags off). */
  private async ensureWhatsappPermissions(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerWhatsappPermission> {
    let row = await this.permRepo.findOne({ where: { customerId, tenantId } });
    if (!row) {
      row = await this.permRepo.save(
        this.permRepo.create({
          customerId,
          tenantId,
          canViewStatus: true,
          canViewInvoice: true,
          canPlaceOrder: false,
          canRepeatOrder: false,
          canViewCredit: false,
          canReceiveBroadcast: false,
        }),
      );
    }
    return row;
  }

  private intentAllowed(intent: WhatsappIntent, perm: CustomerWhatsappPermission): boolean {
    if (intent === 'HELP' || intent === 'UNKNOWN') return true;
    if (intent === 'STATUS') return perm.canViewStatus;
    if (intent === 'INVOICE') return perm.canViewInvoice;
    if (intent === 'CREDIT') return perm.canViewCredit;
    return true;
  }

  private buildInvoiceLink(invoiceNumber: string): string {
    const base = (
      this.config.get<string>('whatsapp.invoiceLinkBaseUrl', '') ?? ''
    ).replace(/\/$/, '');
    if (!base) return '';
    const enc = encodeURIComponent(invoiceNumber);
    return `${base}/${enc}`;
  }

  private async handleInboundText(params: {
    tenantId: string;
    phoneNumberId: string;
    from: string;
    text: string;
    rawInbound: Record<string, unknown>;
  }): Promise<void> {
    const { tenantId, phoneNumberId, from, text, rawInbound } = params;

    if (this.config.get<boolean>('whatsapp.webhookEcho', false)) {
      await this.logMessage(tenantId, null, text, 'IN', {
        echo: true,
        ...rawInbound,
      });
      await this.reply(
        tenantId,
        null,
        phoneNumberId,
        from,
        `You said: ${text}`,
      );
      return;
    }

    const customer = await this.findCustomer(tenantId, from);
    let tempCustomer: TempCustomer | null = null;
    if (!customer) {
      tempCustomer = await this.tempWaCustomers.findOrCreateFromWaFrom(tenantId, from);
    }
    await this.logMessage(tenantId, customer?.id ?? null, text, 'IN', rawInbound);

    if (!customer && !tempCustomer) {
      const msg = await this.render('NOT_REGISTERED', {});
      await this.reply(tenantId, null, phoneNumberId, from, msg);
      return;
    }

    const realCustomerId = customer?.id ?? null;
    const sessionOwner: WaSessionOwner = customer
      ? { customerId: customer.id }
      : { tempCustomerId: tempCustomer!.id };
    const perm: CustomerWhatsappPermission =
      customer != null
        ? await this.ensureWhatsappPermissions(tenantId, customer.id)
        : this.buildTempWhatsappPerm(tenantId, tempCustomer!.id);
    const logCustomerId = customer?.id ?? null;

    const session = await this.sessionSvc.getSession(tenantId, sessionOwner);
    if (
      await this.tryHandleWhatsappMainMenuButton({
        tenantId,
        phoneNumberId,
        from,
        text: text.trim(),
        session,
        sessionOwner,
        perm,
        customer,
        tempCustomer,
        realCustomerId,
        logCustomerId,
      })
    ) {
      return;
    }

    const intent = detectWhatsappIntent(text);

    if (intent === 'CREDIT') {
      await this.orderFlow.resetToIdle(tenantId, sessionOwner);
      if (!realCustomerId) {
        await this.reply(
          tenantId,
          logCustomerId,
          phoneNumberId,
          from,
          [
            'Credit limit and balance appear here after your first order is confirmed',
            '(that creates your retailer account).',
          ].join('\n'),
        );
        return;
      }
      if (!this.intentAllowed(intent, perm)) {
        const msg = await this.render('ACCESS_DENIED', {});
        await this.reply(tenantId, customer!.id, phoneNumberId, from, msg);
        return;
      }
      const lim = Number.parseFloat(customer!.creditLimit ?? '0');
      const out = Number.parseFloat(customer!.creditBalance ?? '0');
      const creditMsg = [
        'Your credit (WhatsApp)',
        `Limit: ₹${Number.isFinite(lim) ? lim.toFixed(2) : customer!.creditLimit}`,
        `Outstanding: ₹${Number.isFinite(out) ? out.toFixed(2) : customer!.creditBalance}`,
      ].join('\n');
      await this.reply(tenantId, customer!.id, phoneNumberId, from, creditMsg);
      return;
    }

    if (intent === 'STATUS' || intent === 'INVOICE') {
      await this.orderFlow.resetToIdle(tenantId, sessionOwner);
      if (!realCustomerId) {
        await this.reply(
          tenantId,
          logCustomerId,
          phoneNumberId,
          from,
          [
            'Order status and invoices are available after your first order is confirmed.',
            'You can still build a cart from the order menu (reply ORDER or use the Orders button).',
          ].join('\n'),
        );
        return;
      }
      if (!this.intentAllowed(intent, perm)) {
        const msg = await this.render('ACCESS_DENIED', {});
        await this.reply(tenantId, customer!.id, phoneNumberId, from, msg);
        return;
      }
      if (intent === 'STATUS') {
        const order = await this.ordersService.findLatestOrderForCustomer(
          tenantId,
          customer!.id,
        );
        const msg = order
          ? await this.render('STATUS_REPLY', {
              orderNo: order.orderNumber,
              status: order.status,
            })
          : await this.render('STATUS_NO_ORDER', {});
        await this.reply(tenantId, customer!.id, phoneNumberId, from, msg);
        return;
      }
      const inv = await this.invoicesService.findLatestInvoiceForCustomer(
        tenantId,
        customer!.id,
      );
      const link = inv ? this.buildInvoiceLink(inv.invoiceNumber) : '';
      const msg = inv
        ? await this.render('INVOICE_REPLY', {
            invoiceNumber: inv.invoiceNumber,
            invoiceLink: link,
          })
        : await this.render('INVOICE_NO_INVOICE', {});
      await this.reply(tenantId, customer!.id, phoneNumberId, from, msg);
      return;
    }

    const rawIn = text.trim();
    const wantsPlaceOrder =
      rawIn.toUpperCase() === 'ORDER' ||
      rawIn.toLowerCase() === 'order' ||
      rawIn.toLowerCase() === 'place order';
    if (wantsPlaceOrder) {
      if (!perm.canPlaceOrder && !perm.canRepeatOrder) {
        const msg = await this.render('ACCESS_DENIED', {});
        await this.reply(tenantId, logCustomerId, phoneNumberId, from, msg);
        return;
      }
      await this.orderFlow.resetToIdle(tenantId, sessionOwner);
      const sessionOrder = await this.sessionSvc.getSession(tenantId, sessionOwner);
      await this.sessionSvc.updateState(sessionOrder.id, WaOrderState.MENU);
      await this.sessionSvc.updateContext(sessionOrder.id, {});
      await this.reply(
        tenantId,
        logCustomerId,
        phoneNumberId,
        from,
        this.orderFlow.welcomeMenu(),
      );
      return;
    }

    const flowOut = await this.orderFlow.handleMessage({
      session,
      text,
      customer,
      tempCustomer,
      realCustomerId,
      tenantId,
      phoneNumberId,
      intent,
      canUseShop: perm.canPlaceOrder || perm.canRepeatOrder,
      perm,
    });
    if (flowOut !== null) {
      await this.deliverFlowReply(tenantId, logCustomerId, phoneNumberId, from, flowOut, session.id);
      return;
    }

    if (!this.intentAllowed(intent, perm)) {
      const msg = await this.render('ACCESS_DENIED', {});
      await this.reply(tenantId, logCustomerId, phoneNumberId, from, msg);
      return;
    }

    const helpVars = { commands: DEFAULT_HELP_COMMANDS };

    if (intent === 'HELP') {
      const menu = await this.waMenu.buildMainMenuReply(tenantId, perm);
      if (menu) {
        await this.sessionSvc.updateState(session.id, WaOrderState.MENU);
        await this.deliverFlowReply(tenantId, logCustomerId, phoneNumberId, from, menu, session.id);
        return;
      }
      const msg = await this.render('HELP_REPLY', helpVars);
      await this.reply(tenantId, logCustomerId, phoneNumberId, from, msg);
      return;
    }

    if (intent === 'UNKNOWN') {
      const msg = await this.render('UNKNOWN_REPLY', helpVars);
      await this.reply(tenantId, logCustomerId, phoneNumberId, from, msg);
    }
  }

  /**
   * Interactive main-menu buttons (`wa_m_*`) and overflow "More".
   * Returns true if this inbound was fully handled here.
   */
  private async tryHandleWhatsappMainMenuButton(params: {
    tenantId: string;
    phoneNumberId: string;
    from: string;
    text: string;
    session: WhatsappOrderSession;
    sessionOwner: WaSessionOwner;
    perm: CustomerWhatsappPermission;
    customer: Customer | null;
    tempCustomer: TempCustomer | null;
    realCustomerId: string | null;
    logCustomerId: string | null;
  }): Promise<boolean> {
    const {
      tenantId,
      phoneNumberId,
      from,
      text,
      session,
      sessionOwner,
      perm,
      customer,
      realCustomerId,
      logCustomerId,
    } = params;

    if (isUnknownWhatsappMenuButtonId(text)) {
      const menu = await this.waMenu.buildMainMenuReply(tenantId, perm);
      if (menu) {
        await this.sessionSvc.updateState(session.id, WaOrderState.MENU);
        await this.deliverFlowReply(tenantId, logCustomerId, phoneNumberId, from, menu, session.id);
      }
      void this.waMenu.logMenuClick(tenantId, logCustomerId, 'INVALID_BUTTON');
      return true;
    }

    const menuTap = parseWhatsappMenuButtonId(text);
    if (!menuTap) return false;

    if (menuTap === 'MORE') {
      const pending = this.waMenu.parsePendingItemsFromContext(
        (session.contextJson ?? {}) as Record<string, unknown>,
      );
      const next =
        pending.length > 0
          ? this.waMenu.buildOverflowPageReply(pending)
          : await this.waMenu.buildMainMenuReply(tenantId, perm);
      if (next) {
        await this.sessionSvc.updateState(session.id, WaOrderState.MENU);
        await this.deliverFlowReply(tenantId, logCustomerId, phoneNumberId, from, next, session.id);
      }
      void this.waMenu.logMenuClick(tenantId, logCustomerId, 'MORE');
      return true;
    }

    if (!isWhatsappMenuKeyPermitted(menuTap, perm)) {
      const msg = await this.render('ACCESS_DENIED', {});
      await this.reply(tenantId, logCustomerId, phoneNumberId, from, msg);
      void this.waMenu.logMenuClick(tenantId, logCustomerId, `${menuTap}_DENIED`);
      return true;
    }

    await this.orderFlow.resetToIdle(tenantId, sessionOwner);
    const sessionOrder = await this.sessionSvc.getSession(tenantId, sessionOwner);

    switch (menuTap as WhatsappTenantMenuKey) {
      case 'ORDER':
        await this.sessionSvc.updateState(sessionOrder.id, WaOrderState.MENU);
        await this.sessionSvc.updateContext(sessionOrder.id, {});
        await this.reply(
          tenantId,
          logCustomerId,
          phoneNumberId,
          from,
          this.orderFlow.welcomeMenu(),
        );
        void this.waMenu.logMenuClick(tenantId, logCustomerId, 'ORDER');
        return true;
      case 'REPEAT': {
        const out = await this.orderFlow.startRepeatOrderFlowFromMenu(
          sessionOrder.id,
          tenantId,
          realCustomerId,
        );
        await this.deliverFlowReply(tenantId, logCustomerId, phoneNumberId, from, out, sessionOrder.id);
        void this.waMenu.logMenuClick(tenantId, logCustomerId, 'REPEAT');
        return true;
      }
      case 'STATUS':
        if (!realCustomerId || !customer) {
          await this.reply(
            tenantId,
            logCustomerId,
            phoneNumberId,
            from,
            [
              'Order status is available after your first confirmed order.',
              'You can still browse from the Orders menu.',
            ].join('\n'),
          );
          void this.waMenu.logMenuClick(tenantId, logCustomerId, 'STATUS');
          return true;
        }
        if (!this.intentAllowed('STATUS', perm)) {
          const msg = await this.render('ACCESS_DENIED', {});
          await this.reply(tenantId, customer.id, phoneNumberId, from, msg);
          void this.waMenu.logMenuClick(tenantId, logCustomerId, 'STATUS_DENIED');
          return true;
        }
        {
          const order = await this.ordersService.findLatestOrderForCustomer(tenantId, customer.id);
          const msg = order
            ? await this.render('STATUS_REPLY', {
                orderNo: order.orderNumber,
                status: order.status,
              })
            : await this.render('STATUS_NO_ORDER', {});
          await this.reply(tenantId, customer.id, phoneNumberId, from, msg);
        }
        void this.waMenu.logMenuClick(tenantId, logCustomerId, 'STATUS');
        return true;
      case 'INVOICE':
        if (!realCustomerId || !customer) {
          await this.reply(
            tenantId,
            logCustomerId,
            phoneNumberId,
            from,
            [
              'Invoices are available after your first confirmed order.',
              'You can still browse from the Orders menu.',
            ].join('\n'),
          );
          void this.waMenu.logMenuClick(tenantId, logCustomerId, 'INVOICE');
          return true;
        }
        if (!this.intentAllowed('INVOICE', perm)) {
          const msg = await this.render('ACCESS_DENIED', {});
          await this.reply(tenantId, customer.id, phoneNumberId, from, msg);
          void this.waMenu.logMenuClick(tenantId, logCustomerId, 'INVOICE_DENIED');
          return true;
        }
        {
          const inv = await this.invoicesService.findLatestInvoiceForCustomer(tenantId, customer.id);
          const link = inv ? this.buildInvoiceLink(inv.invoiceNumber) : '';
          const msg = inv
            ? await this.render('INVOICE_REPLY', {
                invoiceNumber: inv.invoiceNumber,
                invoiceLink: link,
              })
            : await this.render('INVOICE_NO_INVOICE', {});
          await this.reply(tenantId, customer.id, phoneNumberId, from, msg);
        }
        void this.waMenu.logMenuClick(tenantId, logCustomerId, 'INVOICE');
        return true;
      case 'CREDIT':
        if (!realCustomerId || !customer) {
          await this.reply(
            tenantId,
            logCustomerId,
            phoneNumberId,
            from,
            [
              'Credit limit and balance appear here after your first order is confirmed',
              '(that creates your retailer account).',
            ].join('\n'),
          );
          void this.waMenu.logMenuClick(tenantId, logCustomerId, 'CREDIT');
          return true;
        }
        if (!this.intentAllowed('CREDIT', perm)) {
          const msg = await this.render('ACCESS_DENIED', {});
          await this.reply(tenantId, customer.id, phoneNumberId, from, msg);
          void this.waMenu.logMenuClick(tenantId, logCustomerId, 'CREDIT_DENIED');
          return true;
        }
        {
          const lim = Number.parseFloat(customer.creditLimit ?? '0');
          const outBal = Number.parseFloat(customer.creditBalance ?? '0');
          const creditMsg = [
            'Your credit (WhatsApp)',
            `Limit: ₹${Number.isFinite(lim) ? lim.toFixed(2) : customer.creditLimit}`,
            `Outstanding: ₹${Number.isFinite(outBal) ? outBal.toFixed(2) : customer.creditBalance}`,
          ].join('\n');
          await this.reply(tenantId, customer.id, phoneNumberId, from, creditMsg);
        }
        void this.waMenu.logMenuClick(tenantId, logCustomerId, 'CREDIT');
        return true;
      default:
        return false;
    }
  }
}
