import type { ComponentType } from "react";
import { getBlockComponent, type BlockProps } from "@/registry/blockRegistry";
import { translate } from "@/lib/translation-engine";

/** Grid / flex placement (theme JSON). Supports snake_case + camelCase. */
export type BlockPlacement = {
  /** When section uses `layout.areas`, maps to CSS `grid-area`. */
  area?: string;
  column?: number;
  colStart?: number;
  colSpan?: number;
  rowStart?: number;
  rowSpan?: number;
  order?: number;
  /** e.g. `{ "desktop": { "colStart": 1, "colSpan": 6 }, "mobile": { "colStart": 1, "colSpan": 12 } }` */
  responsive?: Record<string, Record<string, unknown>>;
};

export type NormalizedBlock = {
  type: string;
  variant?: string;
  settings: Record<string, unknown>;
  placement: BlockPlacement;
  /** Optional nested blocks (same shape as template JSON `blocks[]`). */
  blocks?: NormalizedBlock[];
};

const PLACEMENT_ROOT_KEYS = new Set([
  "area",
  "col_start",
  "col_span",
  "colStart",
  "colSpan",
  "row_start",
  "row_span",
  "rowStart",
  "rowSpan",
  "column",
  "order",
]);

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && /^-?\d+(\.\d+)?$/u.test(v.trim())) return Number(v.trim());
  return undefined;
}

function pickPlacementFromMap(m: Record<string, unknown>): BlockPlacement {
  const p: BlockPlacement = {};
  const cs = num(m.col_start ?? m.colStart);
  const cspan = num(m.col_span ?? m.colSpan);
  const rs = num(m.row_start ?? m.rowStart);
  const rspan = num(m.row_span ?? m.rowSpan);
  const col = num(m.column);
  const ord = num(m.order);
  const ar = typeof m.area === "string" ? m.area.trim() : "";
  if (ar) p.area = ar;
  if (cs != null) p.colStart = cs;
  if (cspan != null) p.colSpan = cspan;
  if (rs != null) p.rowStart = rs;
  if (rspan != null) p.rowSpan = rspan;
  if (col != null) p.column = col;
  if (ord != null) p.order = ord;

  const layout = m.layout;
  if (layout && typeof layout === "object" && !Array.isArray(layout)) {
    const L = layout as Record<string, unknown>;
    if ("desktop" in L || "mobile" in L || "tablet" in L) {
      p.responsive = L as BlockPlacement["responsive"];
    }
  }
  return p;
}

function stripPlacementKeys(m: Record<string, unknown>): Record<string, unknown> {
  const out = { ...m };
  for (const k of PLACEMENT_ROOT_KEYS) delete out[k];
  if ("layout" in out) {
    const L = out.layout;
    if (L && typeof L === "object" && !Array.isArray(L)) {
      const o = L as Record<string, unknown>;
      if ("desktop" in o || "mobile" in o || "tablet" in o) {
        delete out.layout;
      }
    }
  }
  return out;
}

export function normalizeTemplateBlock(raw: unknown): NormalizedBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const type = typeof o.type === "string" ? o.type.trim() : "";
  if (!type) return null;
  const variant = typeof o.variant === "string" ? o.variant.trim() : undefined;
  const settingsBase: Record<string, unknown> =
    o.settings && typeof o.settings === "object" && !Array.isArray(o.settings)
      ? { ...(o.settings as Record<string, unknown>) }
      : {};
  const skip = new Set(["type", "id", "variant", "settings"]);
  for (const [k, v] of Object.entries(o)) {
    if (skip.has(k)) continue;
    if (v !== undefined) settingsBase[k] = v;
  }
  const placement = pickPlacementFromMap(settingsBase);
  const settings = stripPlacementKeys(settingsBase);
  let nested: NormalizedBlock[] | undefined;
  const rawChildren = o.blocks;
  if (Array.isArray(rawChildren) && rawChildren.length) {
    const parsed = rawChildren.map(normalizeTemplateBlock).filter((x): x is NormalizedBlock => Boolean(x));
    if (parsed.length) nested = parsed;
  }
  return { type, variant, settings, placement, blocks: nested };
}

export default function BlockRenderer({ block, languageCode }: { block: NormalizedBlock; languageCode?: string }) {
  const Cmp = getBlockComponent(block.type, block.variant ?? null) as ComponentType<BlockProps>;
  const nested =
    block.blocks && block.blocks.length > 0 ? (
      <div className="theme-nested-blocks mt-2 flex w-full min-w-0 flex-col gap-2 border-l border-slate-200 pl-3">
      {block.blocks.map((child, i) => (
          <BlockRenderer key={`${child.type}-${i}`} block={child} languageCode={languageCode} />
        ))}
      </div>
    ) : null;
  return (
    <>
      <Cmp {...localizeBlockSettings(block.settings, languageCode)} languageCode={languageCode} />
      {nested}
    </>
  );
}

const NON_UI_BLOCK_KEYS = new Set(["src", "url", "href", "link", "image", "alt", "icon", "slug", "product_slug", "category_slug", "variant", "type", "style", "align"]);

function localizeBlockSettings(settings: Record<string, unknown>, languageCode?: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(settings).map(([key, value]) => [
      key,
      typeof value === "string" && !NON_UI_BLOCK_KEYS.has(key) ? translate(value, languageCode) : value,
    ]),
  );
}

/** Vertical stack — no CSS grid (default section block flow). */
export function BlockStack({ blocks, languageCode }: { blocks?: unknown[] | null; languageCode?: string }) {
  if (!Array.isArray(blocks) || !blocks.length) return null;
  const items = blocks.map(normalizeTemplateBlock).filter((x): x is NormalizedBlock => Boolean(x));
  if (!items.length) return null;
  return (
    <div className="theme-block-stack flex min-w-0 flex-col items-start gap-3" data-theme-blocks>
        {items.map((b, i) => (
          <BlockRenderer key={`${b.type}-${i}`} block={b} languageCode={languageCode} />
      ))}
    </div>
  );
}
