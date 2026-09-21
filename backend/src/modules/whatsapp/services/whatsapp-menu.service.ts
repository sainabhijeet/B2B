import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerWhatsappPermission } from '../../../common/entities/customer-whatsapp-permission.entity';
import { TenantWhatsappMenu } from '../../../common/entities/tenant-whatsapp-menu.entity';
import { WhatsappMenuClick } from '../../../common/entities/whatsapp-menu-click.entity';
import type { WhatsappFlowReply } from '../dto/whatsapp-flow-reply.dto';
import {
  type WhatsappTenantMenuKey,
  WA_MENU_BUTTON_TITLE_MAX,
  WA_MENU_MORE_ID,
  WHATSAPP_TENANT_MENU_KEYS,
  whatsappMenuButtonId,
} from '../whatsapp-menu-key';

const BTN = (
  body: string,
  buttons: Array<{ id: string; title: string }>,
): WhatsappFlowReply => ({ kind: 'buttons', body, buttons });

export type ResolvedWhatsappMenuItem = {
  key: WhatsappTenantMenuKey;
  label: string;
  /** 1-based sequence after permission filter (stable for 2 + More paging). */
  displayOrder: number;
};

const DEFAULT_FALLBACK: ResolvedWhatsappMenuItem[] = [
  { key: 'ORDER', label: 'Orders', displayOrder: 1 },
  { key: 'STATUS', label: 'Order status', displayOrder: 2 },
  { key: 'INVOICE', label: 'Invoice', displayOrder: 3 },
];

const BUILTIN_LABELS: Record<WhatsappTenantMenuKey, string> = {
  ORDER: 'Orders',
  REPEAT: 'Repeat order',
  STATUS: 'Order status',
  INVOICE: 'Invoice',
  CREDIT: 'Credit',
};

const CONTEXT_PENDING_ITEMS = 'wa_menu_pending_items';

/** Last-resort clamp if legacy DB rows exceed Meta limit. */
function truncateTitle(s: string, max = WA_MENU_BUTTON_TITLE_MAX): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function moreButtonTitle(hiddenCount: number): string {
  if (hiddenCount <= 0) return 'More';
  if (hiddenCount === 1) return 'More (1 more)';
  return `More (${hiddenCount} more)`;
}

export function isWhatsappMenuKeyPermitted(
  key: WhatsappTenantMenuKey,
  perm: CustomerWhatsappPermission,
): boolean {
  switch (key) {
    case 'ORDER':
      return perm.canPlaceOrder === true;
    case 'REPEAT':
      return perm.canRepeatOrder === true;
    case 'STATUS':
      return perm.canViewStatus === true;
    case 'INVOICE':
      return perm.canViewInvoice === true;
    case 'CREDIT':
      return perm.canViewCredit === true;
    default:
      return false;
  }
}

@Injectable()
export class WhatsappMenuService {
  private readonly log = new Logger(WhatsappMenuService.name);

  constructor(
    @InjectRepository(TenantWhatsappMenu)
    private readonly menuRepo: Repository<TenantWhatsappMenu>,
    @InjectRepository(WhatsappMenuClick)
    private readonly clickRepo: Repository<WhatsappMenuClick>,
  ) {}

  /** Best-effort analytics for distributor dashboards. */
  async logMenuClick(tenantId: string, customerId: string | null, menuKey: string): Promise<void> {
    try {
      await this.clickRepo.save(
        this.clickRepo.create({
          tenantId,
          customerId,
          menuKey: menuKey.slice(0, 32),
        }),
      );
    } catch (e) {
      this.log.warn(
        `whatsapp_menu_clicks insert failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Distributor UI: all keys with DB override or built-in default. */
  async listTenantMenuForAdmin(tenantId: string): Promise<{
    hasCustomRows: boolean;
    items: Array<{
      menuKey: WhatsappTenantMenuKey;
      label: string;
      position: number;
      isActive: boolean;
      fromDatabase: boolean;
      labelTooLong: boolean;
    }>;
  }> {
    const rows = await this.menuRepo.find({
      where: { tenantId },
      order: { position: 'ASC', menuKey: 'ASC' },
    });
    const hasCustomRows = rows.length > 0;
    const byKey = new Map(rows.map((r) => [r.menuKey as WhatsappTenantMenuKey, r]));
    const items = WHATSAPP_TENANT_MENU_KEYS.map((menuKey, index) => {
      const row = byKey.get(menuKey);
      if (row) {
        return {
          menuKey,
          label: row.label,
          position: row.position,
          isActive: row.isActive,
          fromDatabase: true,
          labelTooLong: row.label.length > WA_MENU_BUTTON_TITLE_MAX,
        };
      }
      const defaultActive =
        !hasCustomRows && DEFAULT_FALLBACK.some((d) => d.key === menuKey);
      return {
        menuKey,
        label: BUILTIN_LABELS[menuKey],
        position: index + 1,
        isActive: defaultActive,
        fromDatabase: false,
        labelTooLong: false,
      };
    });
    return { hasCustomRows, items };
  }

  /**
   * Replace tenant menu rows (upsert by menu_key).
   * At least one active row required.
   */
  async replaceTenantMenu(
    tenantId: string,
    items: Array<{
      menuKey: WhatsappTenantMenuKey;
      label: string;
      position: number;
      isActive: boolean;
    }>,
  ): Promise<void> {
    const active = items.filter((i) => i.isActive);
    if (active.length < 1) {
      throw new BadRequestException('At least one active menu item is required.');
    }
    for (const i of items) {
      if (!WHATSAPP_TENANT_MENU_KEYS.includes(i.menuKey)) {
        throw new BadRequestException(`Invalid menu_key: ${i.menuKey}`);
      }
      const lab = i.label?.trim() ?? '';
      if (!lab) {
        throw new BadRequestException(`Empty label for ${i.menuKey}`);
      }
      if (lab.length > WA_MENU_BUTTON_TITLE_MAX) {
        throw new BadRequestException(
          `Label for "${i.menuKey}" must be at most ${WA_MENU_BUTTON_TITLE_MAX} characters (WhatsApp reply-button limit).`,
        );
      }
    }
    await this.menuRepo.manager.transaction(async (em) => {
      await em.delete(TenantWhatsappMenu, { tenantId });
      for (const i of items) {
        await em.save(
          em.create(TenantWhatsappMenu, {
            tenantId,
            menuKey: i.menuKey,
            label: i.label.trim().slice(0, WA_MENU_BUTTON_TITLE_MAX),
            position: i.position,
            isActive: i.isActive,
          }),
        );
      }
    });
  }

  /**
   * Effective menu for a shopper: tenant config (or defaults) then permission filter,
   * then **re-index** `displayOrder` so overflow paging never sees gaps.
   */
  async getResolvedMenu(
    tenantId: string,
    perm: CustomerWhatsappPermission,
  ): Promise<ResolvedWhatsappMenuItem[]> {
    const rows = await this.menuRepo.find({
      where: { tenantId, isActive: true },
      order: { position: 'ASC', menuKey: 'ASC' },
    });
    let base: ResolvedWhatsappMenuItem[];
    if (rows.length === 0) {
      base = DEFAULT_FALLBACK.map((r) => ({ ...r }));
    } else {
      base = rows.map((r, i) => ({
        key: r.menuKey as WhatsappTenantMenuKey,
        label: r.label,
        displayOrder: i + 1,
      }));
    }
    const filtered = base.filter((item) => isWhatsappMenuKeyPermitted(item.key, perm));
    return filtered.map((item, index) => ({
      ...item,
      displayOrder: index + 1,
    }));
  }

  /**
   * Main welcome body + up to 3 buttons; sets `context[wa_menu_pending_items]` when overflow uses "More".
   */
  async buildMainMenuReply(
    tenantId: string,
    perm: CustomerWhatsappPermission,
  ): Promise<WhatsappFlowReply | null> {
    const items = await this.getResolvedMenu(tenantId, perm);
    if (items.length === 0) return null;
    const { buttons, pendingItems } = this.buildFirstPage(items);
    const body = ['Welcome 👋', 'Choose an option:'].join('\n');
    const reply: WhatsappFlowReply = {
      kind: 'buttons',
      body,
      buttons,
      contextPatch:
        pendingItems.length > 0
          ? { [CONTEXT_PENDING_ITEMS]: pendingItems }
          : { [CONTEXT_PENDING_ITEMS]: [] },
    };
    return reply;
  }

  /** Next page after user tapped "More" (2 + More pattern). */
  buildOverflowPageReply(pendingItems: ResolvedWhatsappMenuItem[]): WhatsappFlowReply | null {
    if (pendingItems.length === 0) return null;
    const normalized = pendingItems.map((item, index) => ({
      ...item,
      displayOrder: index + 1,
    }));
    const { buttons, pendingItems: nextPending } = this.buildFirstPage(normalized);
    const body = ['More options:', 'Choose one:'].join('\n');
    return {
      kind: 'buttons',
      body,
      buttons,
      contextPatch: { [CONTEXT_PENDING_ITEMS]: nextPending },
    };
  }

  /**
   * First screen: up to 3 buttons. If more than 3 items, show first 2 + More (Meta max 3).
   */
  buildFirstPage(items: ResolvedWhatsappMenuItem[]): {
    buttons: Array<{ id: string; title: string }>;
    pendingItems: ResolvedWhatsappMenuItem[];
  } {
    if (items.length <= 3) {
      return {
        buttons: items.map((i) => ({
          id: whatsappMenuButtonId(i.key),
          title: truncateTitle(i.label),
        })),
        pendingItems: [],
      };
    }
    const pendingItems = items.slice(2).map((item, index) => ({
      ...item,
      displayOrder: index + 1,
    }));
    const hiddenCount = items.length - 2;
    return {
      buttons: [
        { id: whatsappMenuButtonId(items[0]!.key), title: truncateTitle(items[0]!.label) },
        { id: whatsappMenuButtonId(items[1]!.key), title: truncateTitle(items[1]!.label) },
        { id: WA_MENU_MORE_ID, title: truncateTitle(moreButtonTitle(hiddenCount)) },
      ],
      pendingItems,
    };
  }

  parsePendingItemsFromContext(ctx: Record<string, unknown>): ResolvedWhatsappMenuItem[] {
    const raw = ctx[CONTEXT_PENDING_ITEMS];
    if (!Array.isArray(raw)) return [];
    const out: ResolvedWhatsappMenuItem[] = [];
    for (const x of raw) {
      if (!x || typeof x !== 'object') continue;
      const o = x as Record<string, unknown>;
      const key = o.key;
      const label = o.label;
      const displayOrder = o.displayOrder;
      if (
        typeof key === 'string' &&
        (WHATSAPP_TENANT_MENU_KEYS as readonly string[]).includes(key) &&
        typeof label === 'string'
      ) {
        const ord =
          typeof displayOrder === 'number' && Number.isFinite(displayOrder)
            ? displayOrder
            : out.length + 1;
        out.push({ key: key as WhatsappTenantMenuKey, label, displayOrder: ord });
      }
    }
    return out.sort((a, b) => a.displayOrder - b.displayOrder);
  }
}
