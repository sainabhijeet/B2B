import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { OrderSource } from '../../../common/enums/order-source.enum';
import type { OrderItem } from '../../../common/entities/order-item.entity';
import { Inventory } from '../../../common/entities/inventory.entity';
import { Product } from '../../../common/entities/product.entity';
import { ProductVariant } from '../../../common/entities/product-variant.entity';
import { TenantSchemaRunner } from '../../../tenancy/tenant-schema-runner.service';
import { OrdersService } from '../../orders/orders.service';
import { TopProductsService } from '../../products/top-products.service';
import { ReorderSuggestionsService } from '../../reorder-suggestions/reorder-suggestions.service';
import type { WhatsappFlowReply } from '../dto/whatsapp-flow-reply.dto';
import type { WhatsappFlowHandleMessageInput } from '../dto/whatsapp-session.dto';
import { WhatsappMenuService } from './whatsapp-menu.service';
import type { WaSessionOwner } from '../whatsapp-session-owner.type';
import { WhatsappOrderSessionService } from './whatsapp-order-session.service';
import { WhatsappTempCustomerService } from './whatsapp-temp-customer.service';

export const WaOrderState = {
  IDLE: 'IDLE',
  MENU: 'MENU',
  /** Last order shown; user picks Confirm All / Edit / Select / Cancel. */
  REPEAT_OPTIONS: 'REPEAT_OPTIONS',
  REPEAT_EDIT_MENU: 'REPEAT_EDIT_MENU',
  REPEAT_EDIT_QTY: 'REPEAT_EDIT_QTY',
  REPEAT_EDIT_MORE: 'REPEAT_EDIT_MORE',
  REPEAT_SELECT: 'REPEAT_SELECT',
  REPEAT_SUMMARY: 'REPEAT_SUMMARY',
  SMART_OPTIONS: 'SMART_OPTIONS',
  SMART_SELECT: 'SMART_SELECT',
  SMART_SUMMARY: 'SMART_SUMMARY',
  TOP_PRODUCTS: 'TOP_PRODUCTS',
  VARIANT: 'VARIANT',
  QUANTITY: 'QUANTITY',
  ADD_MORE: 'ADD_MORE',
  CONFIRM: 'CONFIRM',
  CATEGORY_PICK: 'CATEGORY_PICK',
} as const;

type WaCartLine = {
  variant_id: string;
  name: string;
  price: number;
  qty: number;
};

const TXT = (body: string): WhatsappFlowReply => ({ kind: 'text', body });
const BTN = (
  body: string,
  buttons: Array<{ id: string; title: string }>,
): WhatsappFlowReply => ({ kind: 'buttons', body, buttons });

@Injectable()
export class WhatsappOrderFlowService {
  private readonly log = new Logger(WhatsappOrderFlowService.name);

  constructor(
    private readonly sessions: WhatsappOrderSessionService,
    private readonly orders: OrdersService,
    private readonly tenantRunner: TenantSchemaRunner,
    private readonly topProducts: TopProductsService,
    private readonly reorderSuggestions: ReorderSuggestionsService,
    private readonly tempRetailers: WhatsappTempCustomerService,
    private readonly waMenu: WhatsappMenuService,
  ) {}

  welcomeMenu(): string {
    return [
      'Welcome 👋',
      'Quick Order:',
      '',
      '1. Repeat Last Order',
      '2. Top Products',
      '3. Browse Category',
      '4. Smart reorder (due SKUs)',
      '',
      'Reply with a number. For order status / invoice, type status or invoice anytime.',
    ].join('\n');
  }

  /**
   * Core WhatsApp quick-order state machine. Returns `null` when inbound should use templates / STATUS / INVOICE.
   */
  async handleMessage(
    input: WhatsappFlowHandleMessageInput,
  ): Promise<WhatsappFlowReply | null> {
    const { canUseShop, intent, tenantId, customer, tempCustomer, realCustomerId, perm } = input;
    if (!canUseShop) return null;
    if (intent === 'STATUS' || intent === 'INVOICE' || intent === 'CREDIT') return null;
    if (!perm) return null;

    const session = await this.sessions.getById(input.session.id);
    if (!session) return null;

    const state = session.state ?? WaOrderState.IDLE;
    const t = input.text.trim().toLowerCase();
    const sid = session.id;
    const ownerId =
      customer?.id ??
      tempCustomer?.id ??
      (() => {
        throw new BadRequestException('WhatsApp flow requires customer or tempCustomer.');
      })();
    const ctx = (session.contextJson ?? {}) as Record<string, unknown>;

    if (
      intent === 'HELP' &&
      state !== WaOrderState.IDLE &&
      state !== WaOrderState.MENU
    ) {
      await this.sessions.updateState(sid, WaOrderState.MENU);
      const menu = await this.waMenu.buildMainMenuReply(tenantId, perm);
      return menu ?? TXT(this.welcomeMenu());
    }

    if (state === WaOrderState.IDLE || state === WaOrderState.MENU) {
      if (intent === 'HELP') {
        await this.sessions.updateState(sid, WaOrderState.MENU);
        const menu = await this.waMenu.buildMainMenuReply(tenantId, perm);
        return menu ?? TXT(this.welcomeMenu());
      }
      if (state === WaOrderState.MENU) {
        if (t === '1' || t === '2' || t === '3' || t === '4') {
          return TXT(
            await this.handleMenuChoice(
              sid,
              tenantId,
              ownerId,
              t,
              perm ?? null,
              realCustomerId,
            ),
          );
        }
        return TXT(this.invalidMenuChoice());
      }
      if (intent === 'UNKNOWN' && (t === '1' || t === '2' || t === '3' || t === '4')) {
        await this.sessions.updateState(sid, WaOrderState.MENU);
        return TXT(
          await this.handleMenuChoice(
            sid,
            tenantId,
            ownerId,
            t,
            perm ?? null,
            realCustomerId,
          ),
        );
      }
      return null;
    }

    if (state === WaOrderState.REPEAT_OPTIONS) {
      return await this.handleRepeatOptions(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.REPEAT_EDIT_MENU) {
      return await this.handleRepeatEditMenu(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.REPEAT_EDIT_QTY) {
      return await this.handleRepeatEditQty(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.REPEAT_EDIT_MORE) {
      return await this.handleRepeatEditMore(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.REPEAT_SELECT) {
      return await this.handleRepeatSelect(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.REPEAT_SUMMARY) {
      return await this.handleRepeatSummary(sid, tenantId, ownerId, t, ctx);
    }

    if (state === WaOrderState.SMART_OPTIONS) {
      return await this.handleSmartOptions(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.SMART_SELECT) {
      return await this.handleSmartSelect(sid, tenantId, ownerId, t, ctx);
    }
    if (state === WaOrderState.SMART_SUMMARY) {
      return await this.handleSmartSummary(sid, tenantId, ownerId, t, ctx);
    }

    if (state === WaOrderState.CATEGORY_PICK) {
      if (t === '0' || t === 'menu' || t === 'back') {
        await this.sessions.updateState(sid, WaOrderState.MENU);
        await this.sessions.updateContext(sid, {});
        return TXT(this.welcomeMenu());
      }
      return TXT(
        [
          'Category browsing will list live catalog items in a later release.',
          'Reply 2 from the main menu for Top products, or 0 to go back.',
        ].join('\n'),
      );
    }

    if (state === WaOrderState.TOP_PRODUCTS) {
      return await this.handleTopProducts(sid, tenantId, ownerId, t, ctx);
    }

    if (state === WaOrderState.VARIANT) {
      return await this.handleVariantPick(sid, tenantId, ownerId, t, ctx);
    }

    if (state === WaOrderState.QUANTITY) {
      return await this.handleQuantity(sid, tenantId, ownerId, t, ctx);
    }

    if (state === WaOrderState.ADD_MORE) {
      return await this.handleAddMore(sid, tenantId, ownerId, t, ctx);
    }

    if (state === WaOrderState.CONFIRM) {
      return await this.handleConfirm(sid, tenantId, ownerId, t, ctx);
    }

    return null;
  }

  async resetToIdle(tenantId: string, owner: WaSessionOwner): Promise<void> {
    try {
      await this.sessions.resetSessionForOwner(tenantId, owner);
    } catch (e) {
      this.log.warn(
        `Session reset failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private invalidMenuChoice(): string {
    return 'Please enter a valid option: 1, 2, 3, or 4. Type hi for the main menu.';
  }

  private parsePositiveInt(text: string): number | null {
    const n = Number.parseInt(text.trim(), 10);
    if (!Number.isFinite(n) || n < 1) return null;
    if (String(n) !== text.trim()) return null;
    return n;
  }

  private validateOptionIndex(choice: number, max: number): boolean {
    return choice >= 1 && choice <= max;
  }

  private readCart(ctx: Record<string, unknown>): WaCartLine[] {
    const raw = ctx.cart;
    if (!Array.isArray(raw)) return [];
    const out: WaCartLine[] = [];
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const variant_id = typeof o.variant_id === 'string' ? o.variant_id : '';
      const name = typeof o.name === 'string' ? o.name : 'Item';
      const price = typeof o.price === 'number' ? o.price : Number(o.price);
      const qty = typeof o.qty === 'number' ? o.qty : Number(o.qty);
      if (variant_id && Number.isFinite(price) && Number.isFinite(qty) && qty > 0) {
        out.push({ variant_id, name, price, qty });
      }
    }
    return out;
  }

  private async handleMenuChoice(
    sessionId: string,
    tenantId: string,
    _ownerId: string,
    choice: string,
    perm: { canRepeatOrder: boolean; canPlaceOrder: boolean } | null,
    realCustomerId: string | null,
  ): Promise<string> {
    if (choice === '1') {
      if (!realCustomerId) {
        return [
          'Repeat last order is available after your first confirmed order.',
          'Use option 2 (Top products) to build your first cart.',
        ].join('\n');
      }
      if (perm && !perm.canRepeatOrder) {
        return 'Repeat last order is not enabled for your account. Ask your distributor to turn on “Repeat order”.';
      }
      return await this.startRepeatOrderFlow(sessionId, tenantId, realCustomerId);
    }
    if (choice === '4') {
      if (!realCustomerId) {
        return [
          'Smart reorder needs past order history.',
          'After your first confirmed order it unlocks; try option 2 (Top products) for now.',
        ].join('\n');
      }
      if (perm && !perm.canPlaceOrder) {
        return 'Smart reorder is not enabled for your account. Ask your distributor to turn on “Place order”.';
      }
      return await this.startSmartReorderFlow(sessionId, tenantId, realCustomerId);
    }
    if (choice === '2') {
      if (perm && !perm.canPlaceOrder) {
        return 'Top products ordering is not enabled for your account. Ask your distributor to turn on “Place order”.';
      }
      const { lines, variantIds } = await this.topProducts.listForWhatsappFlow(tenantId, 8);
      if (lines.length === 0) {
        await this.sessions.updateState(sessionId, WaOrderState.MENU);
        await this.sessions.updateContext(sessionId, {});
        return 'No in-stock products are available right now. Try again later or contact your distributor.';
      }
      await this.sessions.updateState(sessionId, WaOrderState.TOP_PRODUCTS);
      await this.sessions.updateContext(sessionId, {
        top_variant_ids: variantIds,
        cart: this.readCart({}),
      });
      return [
        'Top products (distributor list + auto picks if empty):',
        '',
        ...lines,
        '',
        'Reply with a number to select a SKU, or 0 for main menu.',
      ].join('\n');
    }
    if (choice === '3') {
      if (perm && !perm.canPlaceOrder) {
        return 'Category browse is not enabled for your account. Ask your distributor to turn on “Place order”.';
      }
      await this.sessions.updateState(sessionId, WaOrderState.CATEGORY_PICK);
      await this.sessions.updateContext(sessionId, { cart: this.readCart({}) });
      return [
        'Categories',
        '',
        '1. Snacks (preview)',
        '2. Beverages (preview)',
        '3. Staples (preview)',
        '',
        'Live category catalog is coming soon. Reply 0 for the main menu.',
      ].join('\n');
    }
    return this.invalidMenuChoice();
  }

  private async handleTopProducts(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (t === '0' || t === 'menu' || t === 'back') {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, { cart: this.readCart(ctx), top_variant_ids: [] });
      return TXT(this.welcomeMenu());
    }

    const variantIds = (ctx.top_variant_ids as string[] | undefined) ?? [];
    const choice = this.parsePositiveInt(t);
    if (choice === null || !this.validateOptionIndex(choice, variantIds.length)) {
      return TXT(`Please enter a valid option (1–${variantIds.length}) or 0 for the main menu.`);
    }

    const variantId = variantIds[choice - 1]!;
    return this.promptQuantityForVariant(sessionId, tenantId, ctx, variantId);
  }

  private async handleVariantPick(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (t === '0' || t === 'menu' || t === 'back') {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(this.welcomeMenu());
    }

    const variantIds = (ctx.variant_choice_ids as string[] | undefined) ?? [];
    const choice = this.parsePositiveInt(t);
    if (choice === null || !this.validateOptionIndex(choice, variantIds.length)) {
      return TXT(`Please enter a valid option (1–${variantIds.length}) or 0 for the main menu.`);
    }

    const variantId = variantIds[choice - 1]!;
    return this.promptQuantityForVariant(sessionId, tenantId, ctx, variantId);
  }

  private async promptQuantityForVariant(
    sessionId: string,
    tenantId: string,
    ctx: Record<string, unknown>,
    variantId: string,
  ): Promise<WhatsappFlowReply> {
    const snap = await this.loadVariantSnapshot(tenantId, variantId);
    if (!snap) {
      return TXT('That variant is no longer available. Reply 0 for the menu.');
    }

    await this.sessions.updateState(sessionId, WaOrderState.QUANTITY);
    await this.sessions.updateContext(sessionId, {
      top_variant_ids: ctx.top_variant_ids,
      variant_choice_ids: ctx.variant_choice_ids,
      picked_product_id: ctx.picked_product_id,
      current_variant_id: variantId,
      cart: this.readCart(ctx),
    });

    return TXT(
      [
        `Selected: ${snap.productName} (${snap.variantSku})`,
        `Price: ₹${snap.unitPrice}`,
        `MOQ: ${snap.moq}`,
        `Available: ${snap.available}`,
        '',
        'Enter quantity as a whole number.',
      ].join('\n'),
    );
  }

  private async loadVariantSnapshotsBatch(
    tenantId: string,
    variantIds: string[],
  ): Promise<
    Map<
      string,
      {
        productName: string;
        variantSku: string;
        unitPrice: string;
        moq: number;
        available: number;
      }
    >
  > {
    const uniq = [...new Set(variantIds.filter(Boolean))];
    const out = new Map<
      string,
      {
        productName: string;
        variantSku: string;
        unitPrice: string;
        moq: number;
        available: number;
      }
    >();
    if (uniq.length === 0) return out;

    await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const variantsRepo = m.getRepository(ProductVariant);
      const productsRepo = m.getRepository(Product);
      const invRepo = m.getRepository(Inventory);

      const variants = await variantsRepo.find({
        where: { id: In(uniq), deletedAt: IsNull() },
      });
      if (variants.length === 0) return;

      const productIds = [...new Set(variants.map((v) => v.productId))];
      const products = await productsRepo.find({
        where: { id: In(productIds), deletedAt: IsNull() },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const invs = await invRepo.find({
        where: { variantId: In(uniq) },
      });
      const invByVariant = new Map<string, Inventory>();
      for (const inv of invs) {
        if (inv.variantId) invByVariant.set(inv.variantId, inv);
      }

      for (const v of variants) {
        const p = productMap.get(v.productId);
        if (!p) continue;
        const inv = invByVariant.get(v.id);
        const available = Math.max(0, (inv?.stockQuantity ?? 0) - (inv?.reservedStock ?? 0));
        out.set(v.id, {
          productName: p.name,
          variantSku: v.variantSku,
          unitPrice: v.price,
          moq: v.moq ?? 1,
          available,
        });
      }
    });

    return out;
  }

  private async loadVariantSnapshot(
    tenantId: string,
    variantId: string,
  ): Promise<{
    productName: string;
    variantSku: string;
    unitPrice: string;
    moq: number;
    available: number;
  } | null> {
    const m = await this.loadVariantSnapshotsBatch(tenantId, [variantId]);
    return m.get(variantId) ?? null;
  }

  private async handleQuantity(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (t === '0' || t === 'menu' || t === 'back') {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(this.welcomeMenu());
    }

    const qty = this.parsePositiveInt(t);
    if (qty === null) {
      return TXT('Please enter a valid whole number quantity (e.g. 12).');
    }

    const variantId =
      typeof ctx.current_variant_id === 'string' ? ctx.current_variant_id : '';
    if (!variantId) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      return TXT('Session lost context. ' + this.welcomeMenu());
    }

    const snap = await this.loadVariantSnapshot(tenantId, variantId);
    if (!snap) {
      await this.sessions.updateState(sessionId, WaOrderState.TOP_PRODUCTS);
      return TXT('That variant is no longer available. Starting over — reply 2 for top products.');
    }

    if (qty < snap.moq) {
      return TXT(`Minimum order quantity is ${snap.moq}. Enter a quantity of at least ${snap.moq}.`);
    }
    if (qty > snap.available) {
      return TXT(
        `Only ${snap.available} unit(s) available after reservations. Enter a lower quantity or reply 0 for the menu.`,
      );
    }

    const cart = this.readCart(ctx);
    const linePrice = Number(snap.unitPrice);
    cart.push({
      variant_id: variantId,
      name: `${snap.productName} (${snap.variantSku})`,
      price: Number.isFinite(linePrice) ? linePrice : 0,
      qty,
    });

    await this.sessions.updateState(sessionId, WaOrderState.ADD_MORE);
    await this.sessions.updateContext(sessionId, {
      cart,
      current_variant_id: null,
      variant_choice_ids: null,
      picked_product_id: null,
      top_variant_ids: ctx.top_variant_ids,
    });

    return TXT(
      [
        `Added ${snap.productName} × ${qty} to your cart.`,
        '',
        'Add more items?',
        '1. Yes — pick another SKU',
        '2. No — review & confirm order',
      ].join('\n'),
    );
  }

  private async handleAddMore(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (t === '1') {
      const { lines, variantIds } = await this.topProducts.listForWhatsappFlow(tenantId, 8);
      if (lines.length === 0) {
        return TXT('No more catalog items in stock. Reply 2 to confirm what is already in your cart.');
      }
      await this.sessions.updateState(sessionId, WaOrderState.TOP_PRODUCTS);
      await this.sessions.updateContext(sessionId, {
        top_variant_ids: variantIds,
        cart: this.readCart(ctx),
      });
      return TXT(
        ['Top products:', '', ...lines, '', 'Reply with a number to select, or 0 for main menu.'].join('\n'),
      );
    }
    if (t === '2') {
      const cart = this.readCart(ctx);
      if (cart.length === 0) {
        await this.sessions.updateState(sessionId, WaOrderState.MENU);
        return TXT(['Your cart is empty.', '', this.welcomeMenu()].join('\n'));
      }
      await this.sessions.updateState(sessionId, WaOrderState.CONFIRM);
      await this.sessions.updateContext(sessionId, { cart });
      const summary = this.formatCartSummary(cart);
      return BTN(
        `${summary}\n\nTap Confirm to place the order (CREDIT), or Cancel to go back to the menu.`,
        [
          { id: 'wa_confirm', title: 'Confirm' },
          { id: 'wa_cancel', title: 'Cancel' },
        ],
      );
    }
    return TXT('Please enter a valid option: 1 (add more) or 2 (confirm).');
  }

  private formatCartSummary(cart: WaCartLine[]): string {
    const lines = cart.map(
      (c, i) =>
        `${i + 1}. ${c.name} × ${c.qty} @ ₹${c.price.toFixed(2)} → ₹${(c.price * c.qty).toFixed(2)}`,
    );
    const sub = cart.reduce((s, c) => s + c.price * c.qty, 0);
    return ['Order summary (pre-tax display):', '', ...lines, '', `Subtotal ≈ ₹${sub.toFixed(2)}`].join('\n');
  }

  private async resolveCustomerIdForPlacingOrder(
    sessionId: string,
    tenantId: string,
  ): Promise<string> {
    const row = await this.sessions.getById(sessionId);
    if (!row) {
      throw new NotFoundException('WhatsApp order session not found.');
    }
    if (row.customerId) {
      return row.customerId;
    }
    if (row.tempCustomerId) {
      return await this.tempRetailers.promoteToCustomerForSession(
        tenantId,
        row.tempCustomerId,
        sessionId,
      );
    }
    throw new BadRequestException('WhatsApp session has no retailer to bill.');
  }

  private async handleConfirm(
    sessionId: string,
    tenantId: string,
    _ownerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (this.isCancel(t)) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Cancelled.', '', this.welcomeMenu()].join('\n'));
    }
    if (!this.isConfirm(t)) {
      return TXT('Please tap Confirm / Cancel, or type confirm / cancel.');
    }

    const cart = this.readCart(ctx);
    if (cart.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      return TXT(this.welcomeMenu());
    }

    try {
      const customerIdForOrder = await this.resolveCustomerIdForPlacingOrder(sessionId, tenantId);
      const placed = await this.orders.createOrderFromVariantLines({
        tenantId,
        customerId: customerIdForOrder,
        lines: cart.map((c) => ({ variantId: c.variant_id, quantity: c.qty })),
        paymentMode: 'CREDIT',
        orderSource: OrderSource.WHATSAPP,
      });
      await this.sessions.resetSession(sessionId);
      await this.sessions.getSession(tenantId, { customerId: customerIdForOrder });
      return TXT(
        [
          '✅ Order placed',
          `Order No: ${placed.orderNumber}`,
          `Total: ₹${placed.totalAmount}`,
          '',
          this.welcomeMenu(),
        ].join('\n'),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`WhatsApp order create failed: ${msg}`);
      return TXT(
        [
          `We could not place the order: ${msg}`,
          'Your cart is unchanged. Fix the issue or adjust quantities, then try Confirm again.',
        ].join('\n'),
      );
    }
  }

  private formatNumberedCartLines(cart: WaCartLine[]): string[] {
    return cart.map((c, i) => `${i + 1}. ${c.name.split(' (')[0] ?? c.name} × ${c.qty}`);
  }

  /** WhatsApp main-menu REPEAT button (same as numeric menu option 1). */
  async startRepeatOrderFlowFromMenu(
    sessionId: string,
    tenantId: string,
    realCustomerId: string | null,
  ): Promise<WhatsappFlowReply> {
    if (!realCustomerId) {
      return TXT(
        [
          'Repeat last order is available after your first confirmed order.',
          'Use the Orders entry to build your first cart.',
        ].join('\n'),
      );
    }
    const body = await this.startRepeatOrderFlow(sessionId, tenantId, realCustomerId);
    return TXT(body);
  }

  private async startRepeatOrderFlow(
    sessionId: string,
    tenantId: string,
    customerId: string,
  ): Promise<string> {
    const bundle = await this.orders.findLatestOrderWithItemsForCustomer(
      tenantId,
      customerId,
    );
    if (!bundle || bundle.items.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return [
        'No previous order with lines was found.',
        'Try 2 (Top products) or 3 (Categories).',
      ].join('\n');
    }

    const { cart, warnings } = await this.buildFreshCartFromOrderItems(tenantId, bundle.items);
    if (cart.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      const warnBlock =
        warnings.length > 0 ? ['', 'Issues:', ...warnings.map((w) => `• ${w}`)].join('\n') : '';
      return (
        'No lines from your last order could be repeated (inactive or removed catalog). Try Top products (2).' +
        warnBlock
      );
    }

    await this.sessions.updateState(sessionId, WaOrderState.REPEAT_OPTIONS);
    await this.sessions.updateContext(sessionId, {
      mode: 'repeat',
      original_order_id: bundle.order.id,
      original_order_no: bundle.order.orderNumber,
      cart,
      repeat_warnings: warnings,
    });

    const warnBlock =
      warnings.length > 0
        ? ['', 'Note:', ...warnings.map((w) => `• ${w}`), ''].join('\n')
        : '';

    return [
      "Last order (today's prices will apply at checkout):",
      '',
      ...this.formatNumberedCartLines(cart),
      warnBlock,
      'What next?',
      '1. Confirm All',
      '2. Edit Items',
      '3. Select Items (partial repeat)',
      '4. Cancel',
    ].join('\n');
  }

  private async startSmartReorderFlow(
    sessionId: string,
    tenantId: string,
    customerId: string,
  ): Promise<string> {
    const raw = await this.reorderSuggestions.computeSuggestions(tenantId, customerId);
    if (raw.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return [
        'No smart reorder suggestions right now.',
        'We flag SKUs when your usual gap between orders suggests they are due again.',
        '',
        this.welcomeMenu(),
      ].join('\n');
    }

    const cartSeed: WaCartLine[] = raw.map((s) => ({
      variant_id: s.variantId,
      name: s.name,
      price: 0,
      qty: s.suggestedQty,
    }));
    const { cart, notes } = await this.refreshRepeatCartPrices(tenantId, cartSeed);
    if (cart.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return ['Suggestions could not be priced. Try Top products (2).', '', this.welcomeMenu()].join('\n');
    }

    const hints = raw
      .map((s) => {
        if (s.stockAvailable !== undefined && s.stockAvailable < s.suggestedQty) {
          const short = s.name.split(' (')[0] ?? s.name;
          return `${short}: only ${s.stockAvailable} in stock (suggested ${s.suggestedQty}).`;
        }
        return '';
      })
      .filter(Boolean);

    await this.sessions.updateState(sessionId, WaOrderState.SMART_OPTIONS);
    await this.sessions.updateContext(sessionId, {
      mode: 'smart',
      cart,
      smart_price_notes: notes,
      smart_stock_hints: hints,
    });

    const noteBlock = [...notes.map((n) => `• ${n}`), ...hints.map((h) => `• ${h}`)];
    const nb = noteBlock.length > 0 ? ['', ...noteBlock, ''].join('\n') : '';

    return [
      'Time to reorder 👋 (based on your buying rhythm):',
      '',
      ...this.formatNumberedCartLines(cart),
      nb,
      '1. Reorder all',
      '2. Select items (partial)',
      '3. Skip',
    ].join('\n');
  }

  /** Rebuild cart from last order lines using current catalog prices (never reuse old order line price). */
  private async buildFreshCartFromOrderItems(
    tenantId: string,
    items: OrderItem[],
  ): Promise<{ cart: WaCartLine[]; warnings: string[] }> {
    const warnings: string[] = [];
    const cart: WaCartLine[] = [];

    await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const vRepo = m.getRepository(ProductVariant);
      const pRepo = m.getRepository(Product);

      const variantIds = [...new Set(items.map((i) => i.variantId).filter(Boolean))] as string[];
      const variants =
        variantIds.length === 0
          ? []
          : await vRepo.find({ where: { id: In(variantIds), deletedAt: IsNull() } });
      const vMap = new Map(variants.map((v) => [v.id, v]));
      const productIds = [...new Set(variants.map((v) => v.productId))];
      const products =
        productIds.length === 0 ? [] : await pRepo.find({ where: { id: In(productIds), deletedAt: IsNull() } });
      const pMap = new Map(products.map((p) => [p.id, p]));

      for (const it of items) {
        const label = it.product?.name ?? 'Item';
        if (!it.variantId) {
          warnings.push(`${label}: skipped (no SKU on line).`);
          continue;
        }
        const v = vMap.get(it.variantId);
        if (!v) {
          warnings.push(`${label}: skipped (variant removed).`);
          continue;
        }
        if (v.status !== 'active') {
          warnings.push(`${label}: skipped (variant inactive).`);
          continue;
        }
        const p = pMap.get(v.productId);
        if (!p) {
          warnings.push(`${label}: skipped (product removed).`);
          continue;
        }
        if (p.status !== 'active') {
          warnings.push(`${label}: skipped (product not active).`);
          continue;
        }
        const unit = Number(v.price);
        cart.push({
          variant_id: v.id,
          name: `${p.name} (${v.variantSku})`,
          price: Number.isFinite(unit) ? unit : 0,
          qty: it.quantity,
        });
      }
    });

    return { cart, warnings };
  }

  private async refreshRepeatCartPrices(
    tenantId: string,
    cart: WaCartLine[],
  ): Promise<{ cart: WaCartLine[]; notes: string[] }> {
    const notes: string[] = [];
    const next: WaCartLine[] = [];
    const snaps = await this.loadVariantSnapshotsBatch(
      tenantId,
      cart.map((c) => c.variant_id),
    );
    for (const line of cart) {
      const snap = snaps.get(line.variant_id);
      if (!snap) {
        notes.push(`Dropped: ${line.name} (no longer in catalog).`);
        continue;
      }
      const unit = Number(snap.unitPrice);
      const newPrice = Number.isFinite(unit) ? unit : line.price;
      if (Math.abs(newPrice - line.price) > 0.005) {
        notes.push(`${snap.productName}: price updated to ₹${newPrice.toFixed(2)} (was ₹${line.price.toFixed(2)}).`);
      }
      next.push({
        variant_id: line.variant_id,
        name: `${snap.productName} (${snap.variantSku})`,
        price: newPrice,
        qty: line.qty,
      });
    }
    return { cart: next, notes };
  }

  private async validateRepeatCartStock(
    tenantId: string,
    cart: WaCartLine[],
  ): Promise<string[]> {
    const errors: string[] = [];
    const variantIds = [...new Set(cart.map((c) => c.variant_id))];
    if (variantIds.length === 0) return errors;

    await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const vRepo = m.getRepository(ProductVariant);
      const invRepo = m.getRepository(Inventory);
      const pRepo = m.getRepository(Product);

      const variants = await vRepo.find({
        where: { id: In(variantIds), deletedAt: IsNull() },
      });
      const vMap = new Map(variants.map((v) => [v.id, v]));
      const productIds = [...new Set(variants.map((v) => v.productId))];
      const products = await pRepo.find({
        where: { id: In(productIds), deletedAt: IsNull() },
      });
      const pMap = new Map(products.map((p) => [p.id, p]));
      const invs = await invRepo.find({ where: { variantId: In(variantIds) } });
      const invByVariant = new Map<string, Inventory>();
      for (const inv of invs) {
        if (inv.variantId) invByVariant.set(inv.variantId, inv);
      }

      for (const line of cart) {
        const v = vMap.get(line.variant_id);
        if (!v) {
          errors.push(`${line.name}: variant missing.`);
          continue;
        }
        const p = pMap.get(v.productId);
        if (!p) {
          errors.push(`${line.name}: product missing.`);
          continue;
        }
        const inv = invByVariant.get(v.id);
        const avail = (inv?.stockQuantity ?? 0) - (inv?.reservedStock ?? 0);
        if (line.qty > avail) {
          const short = p.name;
          errors.push(`${short}: only ${avail} available (you asked ${line.qty}).`);
        }
        const moq = v.moq ?? 1;
        if (line.qty < moq) {
          errors.push(`${p.name}: MOQ is ${moq}.`);
        }
      }
    });
    return errors;
  }

  private async handleRepeatOptions(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    if (t === '4' || t === 'cancel') {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Cancelled.', '', this.welcomeMenu()].join('\n'));
    }
    if (t === '1') {
      const { cart: fresh, notes } = await this.refreshRepeatCartPrices(tenantId, cart);
      if (fresh.length === 0) {
        await this.sessions.updateState(sessionId, WaOrderState.MENU);
        await this.sessions.updateContext(sessionId, {});
        return TXT(['Nothing to order after refresh.', '', this.welcomeMenu()].join('\n'));
      }
      const stockErrs = await this.validateRepeatCartStock(tenantId, fresh);
      if (stockErrs.length > 0) {
        const hint = notes.length ? ['', ...notes.map((n) => `• ${n}`)].join('\n') : '';
        return TXT(
          [
            'Cannot confirm yet:',
            '',
            ...stockErrs.map((e) => `• ${e}`),
            hint,
            '',
            'Reply 2 to edit quantities, 3 to pick fewer lines, or 4 to cancel.',
          ].join('\n'),
        );
      }
      return this.placeCreditCartOrder(sessionId, tenantId, customerId, fresh, notes);
    }
    if (t === '2') {
      if (cart.length === 0) {
        return TXT('Your repeat cart is empty. Reply 4 to cancel.');
      }
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_EDIT_MENU);
      return TXT(
        [
          'Select item to edit:',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          'Reply with the line number, or 0 to go back.',
        ].join('\n'),
      );
    }
    if (t === '3') {
      if (cart.length === 0) {
        return TXT('Your repeat cart is empty. Reply 4 to cancel.');
      }
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_SELECT);
      return TXT(
        [
          'Select line numbers to keep (comma-separated), e.g. 1 or 1,2:',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          'Reply 0 to go back.',
        ].join('\n'),
      );
    }
    return TXT('Reply 1 (Confirm All), 2 (Edit), 3 (Select items), or 4 (Cancel).');
  }

  private async handleSmartOptions(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    if (t === '3' || t === 'skip' || t === 'cancel') {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Skipped smart reorder.', '', this.welcomeMenu()].join('\n'));
    }
    if (t === '1') {
      const { cart: fresh, notes } = await this.refreshRepeatCartPrices(tenantId, cart);
      if (fresh.length === 0) {
        await this.sessions.updateState(sessionId, WaOrderState.MENU);
        await this.sessions.updateContext(sessionId, {});
        return TXT(['Nothing to order after refresh.', '', this.welcomeMenu()].join('\n'));
      }
      const stockErrs = await this.validateRepeatCartStock(tenantId, fresh);
      if (stockErrs.length > 0) {
        const hint = notes.length ? ['', ...notes.map((n) => `• ${n}`)].join('\n') : '';
        return TXT(
          [
            'Cannot reorder yet:',
            '',
            ...stockErrs.map((e) => `• ${e}`),
            hint,
            '',
            'Reply 2 to pick fewer lines, or 3 to skip.',
          ].join('\n'),
        );
      }
      return this.placeCreditCartOrder(sessionId, tenantId, customerId, fresh, notes);
    }
    if (t === '2') {
      if (cart.length === 0) {
        return TXT('Nothing to select. Reply 3 to skip.');
      }
      await this.sessions.updateState(sessionId, WaOrderState.SMART_SELECT);
      return TXT(
        [
          'Select line numbers to keep (comma-separated), e.g. 1 or 1,2:',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          'Reply 0 to go back.',
        ].join('\n'),
      );
    }
    return TXT('Reply 1 (Reorder all), 2 (Select items), or 3 (Skip).');
  }

  private async gotoSmartSummary(
    sessionId: string,
    tenantId: string,
    ctx: Record<string, unknown>,
    cart: WaCartLine[],
  ): Promise<WhatsappFlowReply> {
    const { cart: fresh, notes } = await this.refreshRepeatCartPrices(tenantId, cart);
    if (fresh.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Nothing left to order.', '', this.welcomeMenu()].join('\n'));
    }
    await this.sessions.updateState(sessionId, WaOrderState.SMART_SUMMARY);
    await this.sessions.updateContext(sessionId, { ...ctx, cart: fresh, smart_price_notes: notes });
    const summary = this.formatCartSummary(fresh);
    const noteBlock =
      notes.length > 0 ? ['', 'Updates:', ...notes.map((n) => `• ${n}`)].join('\n') : '';
    return BTN(
      `${summary}${noteBlock}\n\nTap Confirm to place this order (CREDIT), or Cancel.`,
      [
        { id: 'wa_confirm', title: 'Confirm' },
        { id: 'wa_cancel', title: 'Cancel' },
      ],
    );
  }

  private async handleSmartSelect(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    if (t === '0' || t === 'back') {
      await this.sessions.updateState(sessionId, WaOrderState.SMART_OPTIONS);
      return TXT(
        [
          'Back to smart reorder.',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          '1. Reorder all',
          '2. Select items (partial)',
          '3. Skip',
        ].join('\n'),
      );
    }
    const idxs = this.parseCommaLineIndices(t, cart.length);
    if (!idxs || idxs.length === 0) {
      return TXT(`Enter line numbers between 1 and ${cart.length} (comma-separated), or 0 to go back.`);
    }
    const filtered = idxs.map((i) => cart[i]!).filter(Boolean);
    await this.sessions.updateContext(sessionId, { ...ctx, cart: filtered });
    return this.gotoSmartSummary(sessionId, tenantId, { ...ctx, cart: filtered }, filtered);
  }

  private async handleSmartSummary(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (this.isCancel(t)) {
      await this.sessions.updateState(sessionId, WaOrderState.SMART_OPTIONS);
      const cart = this.readCart(ctx);
      return TXT(
        [
          'Back to smart reorder.',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          '1. Reorder all',
          '2. Select items (partial)',
          '3. Skip',
        ].join('\n'),
      );
    }
    if (!this.isConfirm(t)) {
      return TXT('Tap Confirm / Cancel, or type confirm / cancel.');
    }
    const cart = this.readCart(ctx);
    const { cart: fresh, notes } = await this.refreshRepeatCartPrices(tenantId, cart);
    if (fresh.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Nothing to order after refresh.', '', this.welcomeMenu()].join('\n'));
    }
    const stockErrs = await this.validateRepeatCartStock(tenantId, fresh);
    if (stockErrs.length > 0) {
      return TXT(
        [
          'Cannot place order:',
          '',
          ...stockErrs.map((e) => `• ${e}`),
          '',
          'Cancel, then pick fewer lines (2) or skip (3).',
        ].join('\n'),
      );
    }
    return this.placeCreditCartOrder(sessionId, tenantId, customerId, fresh, notes);
  }

  private async handleRepeatEditMenu(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    if (t === '0' || t === 'back') {
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_OPTIONS);
      return TXT(
        [
          'Back to repeat options.',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          '1. Confirm All',
          '2. Edit Items',
          '3. Select Items',
          '4. Cancel',
        ].join('\n'),
      );
    }
    const idx = this.parsePositiveInt(t);
    if (idx === null || !this.validateOptionIndex(idx, cart.length)) {
      return TXT(`Enter a line 1–${cart.length}, or 0 to go back.`);
    }
    const line = cart[idx - 1]!;
    await this.sessions.updateState(sessionId, WaOrderState.REPEAT_EDIT_QTY);
    await this.sessions.updateContext(sessionId, {
      ...ctx,
      repeat_edit_line_index: idx - 1,
    });
    return TXT(
      [
        `Line ${idx}: ${line.name}`,
        `Current qty: ${line.qty}`,
        '',
        'Enter the new quantity as a whole number.',
      ].join('\n'),
    );
  }

  private async handleRepeatEditQty(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    const lineIdx =
      typeof ctx.repeat_edit_line_index === 'number' ? ctx.repeat_edit_line_index : Number(ctx.repeat_edit_line_index);
    if (!Number.isFinite(lineIdx) || lineIdx < 0 || lineIdx >= cart.length) {
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_EDIT_MENU);
      return TXT('Session lost edit context. Pick a line again.');
    }

    const qty = this.parsePositiveInt(t);
    if (qty === null) {
      return TXT('Enter a valid whole number quantity.');
    }

    const line = cart[lineIdx]!;
    const snap = await this.loadVariantSnapshot(tenantId, line.variant_id);
    if (!snap) {
      cart.splice(lineIdx, 1);
      await this.sessions.updateContext(sessionId, { ...ctx, cart, repeat_edit_line_index: undefined });
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_EDIT_MENU);
      return TXT('That SKU is gone — removed from your repeat list. Pick another line or 0 to go back.');
    }
    if (qty < snap.moq) {
      return TXT(`MOQ is ${snap.moq}. Enter at least ${snap.moq}.`);
    }
    if (qty > snap.available) {
      return TXT(`Only ${snap.available} in stock. Enter a lower quantity.`);
    }

    const unit = Number(snap.unitPrice);
    cart[lineIdx] = {
      variant_id: line.variant_id,
      name: `${snap.productName} (${snap.variantSku})`,
      price: Number.isFinite(unit) ? unit : line.price,
      qty,
    };

    await this.sessions.updateState(sessionId, WaOrderState.REPEAT_EDIT_MORE);
    await this.sessions.updateContext(sessionId, {
      ...ctx,
      cart,
      repeat_edit_line_index: undefined,
    });

    return TXT(['Updated.', '', 'Edit another line?', '1. Yes', '2. No — review order'].join('\n'));
  }

  private async handleRepeatEditMore(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    if (t === '1') {
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_EDIT_MENU);
      return TXT(
        [
          'Select item to edit:',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          'Reply with the line number, or 0 to go back.',
        ].join('\n'),
      );
    }
    if (t === '2') {
      return this.gotoRepeatSummary(sessionId, tenantId, ctx, cart);
    }
    return TXT('Reply 1 to edit another line, or 2 to review and confirm.');
  }

  private async gotoRepeatSummary(
    sessionId: string,
    tenantId: string,
    ctx: Record<string, unknown>,
    cart: WaCartLine[],
  ): Promise<WhatsappFlowReply> {
    const { cart: fresh, notes } = await this.refreshRepeatCartPrices(tenantId, cart);
    if (fresh.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Nothing left to order.', '', this.welcomeMenu()].join('\n'));
    }
    await this.sessions.updateState(sessionId, WaOrderState.REPEAT_SUMMARY);
    await this.sessions.updateContext(sessionId, { ...ctx, cart: fresh, repeat_price_notes: notes });
    const summary = this.formatCartSummary(fresh);
    const noteBlock =
      notes.length > 0 ? ['', 'Updates:', ...notes.map((n) => `• ${n}`)].join('\n') : '';
    return BTN(
      `${summary}${noteBlock}\n\nTap Confirm to place this order (CREDIT), or Cancel.`,
      [
        { id: 'wa_confirm', title: 'Confirm' },
        { id: 'wa_cancel', title: 'Cancel' },
      ],
    );
  }

  private parseCommaLineIndices(text: string, max: number): number[] | null {
    const parts = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    const zero = new Set<number>();
    for (const p of parts) {
      const n = Number.parseInt(p, 10);
      if (!Number.isFinite(n) || n < 1 || n > max) return null;
      if (String(n) !== p) return null;
      zero.add(n - 1);
    }
    return [...zero].sort((a, b) => a - b);
  }

  private async handleRepeatSelect(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    const cart = this.readCart(ctx);
    if (t === '0' || t === 'back') {
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_OPTIONS);
      return TXT(
        [
          'Back to repeat options.',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          '1. Confirm All',
          '2. Edit Items',
          '3. Select Items',
          '4. Cancel',
        ].join('\n'),
      );
    }
    const idxs = this.parseCommaLineIndices(t, cart.length);
    if (!idxs || idxs.length === 0) {
      return TXT(`Enter line numbers between 1 and ${cart.length} (comma-separated), or 0 to go back.`);
    }
    const filtered = idxs.map((i) => cart[i]!).filter(Boolean);
    await this.sessions.updateContext(sessionId, { ...ctx, cart: filtered });
    return this.gotoRepeatSummary(sessionId, tenantId, { ...ctx, cart: filtered }, filtered);
  }

  private async handleRepeatSummary(
    sessionId: string,
    tenantId: string,
    customerId: string,
    t: string,
    ctx: Record<string, unknown>,
  ): Promise<WhatsappFlowReply> {
    if (this.isCancel(t)) {
      await this.sessions.updateState(sessionId, WaOrderState.REPEAT_OPTIONS);
      const cart = this.readCart(ctx);
      return TXT(
        [
          'Back to repeat options.',
          '',
          ...this.formatNumberedCartLines(cart),
          '',
          '1. Confirm All',
          '2. Edit Items',
          '3. Select Items',
          '4. Cancel',
        ].join('\n'),
      );
    }
    if (!this.isConfirm(t)) {
      return TXT('Tap Confirm / Cancel, or type confirm / cancel.');
    }
    const cart = this.readCart(ctx);
    const { cart: fresh, notes } = await this.refreshRepeatCartPrices(tenantId, cart);
    if (fresh.length === 0) {
      await this.sessions.updateState(sessionId, WaOrderState.MENU);
      await this.sessions.updateContext(sessionId, {});
      return TXT(['Nothing to order after refresh.', '', this.welcomeMenu()].join('\n'));
    }
    const stockErrs = await this.validateRepeatCartStock(tenantId, fresh);
    if (stockErrs.length > 0) {
      return TXT(
        [
          'Cannot place order:',
          '',
          ...stockErrs.map((e) => `• ${e}`),
          '',
          'Reply cancel then use Edit (2) or adjust selection (3).',
        ].join('\n'),
      );
    }
    return this.placeCreditCartOrder(sessionId, tenantId, customerId, fresh, notes);
  }

  private async placeCreditCartOrder(
    sessionId: string,
    tenantId: string,
    _ownerId: string,
    cart: WaCartLine[],
    extraNotes: string[],
  ): Promise<WhatsappFlowReply> {
    try {
      const customerIdForOrder = await this.resolveCustomerIdForPlacingOrder(sessionId, tenantId);
      const placed = await this.orders.createOrderFromVariantLines({
        tenantId,
        customerId: customerIdForOrder,
        lines: cart.map((c) => ({ variantId: c.variant_id, quantity: c.qty })),
        paymentMode: 'CREDIT',
        orderSource: OrderSource.WHATSAPP,
      });
      await this.sessions.resetSession(sessionId);
      await this.sessions.getSession(tenantId, { customerId: customerIdForOrder });
      const noteBlock =
        extraNotes.length > 0 ? ['', ...extraNotes.map((n) => `• ${n}`)].join('\n') : '';
      return TXT(
        [
          '✅ Order placed',
          `Order No: ${placed.orderNumber}`,
          `Total: ₹${placed.totalAmount}`,
          noteBlock,
          '',
          this.welcomeMenu(),
        ].join('\n'),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Repeat place order failed: ${msg}`);
      return TXT(
        [
          `Could not place the order: ${msg}`,
          'Your cart is unchanged. Try Edit (2), adjust lines (3), or confirm again after fixing credit/stock.',
        ].join('\n'),
      );
    }
  }

  private isConfirm(t: string): boolean {
    return ['confirm', 'yes', 'ok', 'y', '1', 'ha', 'han', 'हां', 'wa_confirm'].includes(t);
  }

  private isCancel(t: string): boolean {
    return ['cancel', 'no', 'n', 'stop', '0', 'back', 'wa_cancel'].includes(t);
  }
}
