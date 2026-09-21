/**
 * THEME LAYOUT ENGINE
 *
 * Purpose
 * -------
 * Convert JSON section layout definitions into runtime CSS layout.
 *
 * Rendering pipeline
 * ------------------
 * template
 *   ↓
 * section
 *   ↓
 * layout engine
 *   ↓
 * blocks
 *   ↓
 * React render
 *
 * Supported layout fields
 * -----------------------
 * layout.type      : grid | flex | container
 * layout.columns   : number of grid columns (numeric grid, no named areas)
 * layout.gap       : spacing between blocks
 * layout.areas     : CSS grid-template-areas (rows of space-separated area names)
 *
 * Block positioning
 * -----------------
 * block.area       : named grid area (used with layout.areas)
 * block.col_start  : grid column start (numeric grid)
 * block.col_span   : grid column span
 *
 * Priority (numeric grid)
 * -----------------------
 * layout.areas present → named grid + block.area
 * else                 → repeat(columns) + col_start / col_span
 *
 * Design goals
 * ------------
 * - Figma-compatible layouts
 * - JSON driven
 * - CDN theme safe
 * - backwards compatible
 *
 * Future extensions
 * -----------------
 * - responsive layout rules
 * - masonry layout
 * - carousel sections
 * - drag-drop editor support
 * - theme.json `allowedSections` / `allowed_sections` (see `theme-capabilities.ts`) to scope builder UI
 */

import type { CSSProperties } from "react";
import type { SectionColumn, SectionInstance, SectionLayoutDescriptor } from "@/engine/schema/theme-engine.schema";
import BlockRenderer, { BlockStack, type NormalizedBlock, normalizeTemplateBlock } from "@/engine/block-renderer";

export type ResolvedLayout =
  | { mode: "stack" }
  | { mode: "grid"; columns: number; gap: string; mobileStack: boolean; areas?: string[] }
  | { mode: "flex"; direction: "row" | "column"; gap: string; wrap: boolean };

function str(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.min(Math.floor(v), 24);
  if (typeof v === "string" && /^\d+$/u.test(v.trim())) return Math.min(parseInt(v.trim(), 10), 24);
  return fallback;
}

function parseAreas(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const row of raw) {
    if (typeof row === "string" && row.trim()) out.push(row.trim());
  }
  return out.length ? out : null;
}

/** Max cell count per row → `grid-template-columns` track count. */
export function columnCountFromAreas(rows: string[]): number {
  let max = 1;
  for (const row of rows) {
    const n = row.trim().split(/\s+/u).filter(Boolean).length;
    if (n > max) max = n;
  }
  return max;
}

/** CSS `grid-template-areas` value: each row quoted. */
export function toGridTemplateAreas(rows: string[]): string {
  return rows
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const cells = row.split(/\s+/u).filter(Boolean);
      return `"${cells.join(" ")}"`;
    })
    .join("\n");
}

export function resolveSectionLayout(raw: SectionLayoutDescriptor | undefined | null): ResolvedLayout {
  if (raw == null || raw === "") return { mode: "stack" };
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "2-column" || s === "two-column" || s === "split") {
      return { mode: "grid", columns: 12, gap: "clamp(16px, 3vw, 32px)", mobileStack: true };
    }
    if (s === "3-column" || s === "three-column") {
      return { mode: "grid", columns: 12, gap: "20px", mobileStack: true };
    }
    if (s === "feature-grid") {
      return { mode: "grid", columns: 12, gap: "24px", mobileStack: true };
    }
    if (s === "single" || s === "stack" || s === "container") return { mode: "stack" };
    return { mode: "stack" };
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const type = String(o.type ?? "grid").toLowerCase();
    const mobileStack = o.mobileStack !== false;
    if (type === "flex") {
      return {
        mode: "flex",
        direction: o.direction === "column" || o.direction === "col" ? "column" : "row",
        gap: str(o.gap, "16px"),
        wrap: Boolean(o.wrap),
      };
    }
    if (type === "carousel" || type === "masonry") {
      return { mode: "stack" };
    }
    const areas = parseAreas(o.areas);
    if (areas?.length) {
      const inferred = columnCountFromAreas(areas);
      return {
        mode: "grid",
        columns: inferred,
        gap: str(o.gap, "24px"),
        mobileStack,
        areas,
      };
    }
    return {
      mode: "grid",
      columns: num(o.columns, 12),
      gap: str(o.gap, "24px"),
      mobileStack,
    };
  }
  return { mode: "stack" };
}

function desktopPlacement(b: NormalizedBlock): NormalizedBlock["placement"] {
  const base = b.placement;
  const d = base.responsive?.desktop;
  if (!d || typeof d !== "object" || Array.isArray(d)) return base;
  const extra = d as Record<string, unknown>;
  const ar = typeof extra.area === "string" ? extra.area.trim() : "";
  const colStart = num(extra.col_start ?? extra.colStart, NaN);
  const colSpan = num(extra.col_span ?? extra.colSpan, NaN);
  const rowStart = num(extra.row_start ?? extra.rowStart, NaN);
  const rowSpan = num(extra.row_span ?? extra.rowSpan, NaN);
  return {
    ...base,
    ...(ar ? { area: ar } : {}),
    ...(Number.isFinite(colStart) ? { colStart } : {}),
    ...(Number.isFinite(colSpan) ? { colSpan } : {}),
    ...(Number.isFinite(rowStart) ? { rowStart } : {}),
    ...(Number.isFinite(rowSpan) ? { rowSpan } : {}),
  };
}

function gridCellStyle(placement: NormalizedBlock["placement"], columnCount: number, namedAreas: boolean): CSSProperties {
  if (namedAreas) {
    if (placement.area) {
      const style: CSSProperties = { gridArea: placement.area, minWidth: 0 };
      if (placement.order != null) style.order = placement.order;
      return style;
    }
    return { minWidth: 0 };
  }
  const p = placement;
  const cs = p.colStart ?? (typeof p.column === "number" ? (p.column - 1) * (columnCount / 2) + 1 : undefined);
  const cspan = p.colSpan ?? (typeof p.column === "number" ? columnCount / 2 : columnCount);
  const rs = p.rowStart;
  const rspan = p.rowSpan;
  const style: CSSProperties = { minWidth: 0 };
  if (p.order != null) style.order = p.order;
  if (cs != null && Number.isFinite(cspan) && cspan > 0) {
    style.gridColumn = `${Math.max(1, cs)} / span ${Math.max(1, cspan)}`;
  } else if (Number.isFinite(cspan) && cspan > 0) {
    style.gridColumn = `span ${Math.max(1, cspan)}`;
  }
  if (rs != null && rspan != null && Number.isFinite(rspan) && rspan > 0) {
    style.gridRow = `${Math.max(1, rs)} / span ${Math.max(1, rspan)}`;
  }
  return style;
}

type LayoutProps = {
  layout?: SectionLayoutDescriptor | null;
  blocks?: SectionInstance["blocks"] | null;
  columns?: SectionColumn[] | null;
  scopeId: string;
  languageCode?: string;
};

function sanitizeScopeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "layout";
}

/** Central layout: columns → multi track; else layout descriptor → grid/flex/stack; else blocks only → stack. */
export default function SectionLayoutView({ layout, blocks, columns, scopeId, languageCode }: LayoutProps) {
  const safe = sanitizeScopeId(scopeId);

  if (Array.isArray(columns) && columns.length > 0) {
    const resolved = resolveSectionLayout(layout ?? "stack");
    const gap = resolved.mode === "grid" ? resolved.gap : resolved.mode === "flex" ? resolved.gap : "24px";
    return (
      <div
        className="theme-section-columns w-full"
        data-layout-scope={safe}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          gap,
        }}
      >
        {columns.map((col, i) => (
          <div key={col.id ?? `col-${i}`} className="theme-section-column min-w-0">
            <BlockStack blocks={col.blocks as unknown[]} languageCode={languageCode} />
          </div>
        ))}
      </div>
    );
  }

  const list = Array.isArray(blocks) ? blocks.map(normalizeTemplateBlock).filter((x): x is NormalizedBlock => Boolean(x)) : [];
  if (!list.length) return null;

  const resolved = resolveSectionLayout(layout ?? undefined);

  if (resolved.mode === "stack") {
    return (
      <div className="theme-section-layout-stack w-full" data-layout-scope={safe}>
        <BlockStack blocks={blocks ?? []} languageCode={languageCode} />
      </div>
    );
  }

  if (resolved.mode === "flex") {
    return (
      <div
        className="theme-section-layout-flex w-full"
        data-layout-scope={safe}
        style={{
          display: "flex",
          flexDirection: resolved.direction,
          flexWrap: resolved.wrap ? "wrap" : "nowrap",
          gap: resolved.gap,
        }}
      >
        {list.map((b, i) => (
          <div key={`${b.type}-${i}`} className="theme-layout-cell min-w-0" style={{ order: b.placement.order }}>
            <BlockRenderer block={b} languageCode={languageCode} />
          </div>
        ))}
      </div>
    );
  }

  const namedAreas = Boolean(resolved.areas?.length);
  const cols = resolved.columns;
  const mobileStack = resolved.mobileStack;

  const gridStyle: CSSProperties = {
    display: "grid",
    gap: resolved.gap,
    width: "100%",
  };

  if (namedAreas && resolved.areas) {
    gridStyle.gridTemplateAreas = toGridTemplateAreas(resolved.areas);
    gridStyle.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  } else {
    gridStyle.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  }

  return (
    <div
      className={`theme-section-layout-grid w-full${namedAreas ? " theme-section-layout-areas" : ""}`}
      data-layout-scope={safe}
    >
      {mobileStack && namedAreas ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `@media (max-width: 767px) {
              [data-layout-scope="${safe}"].theme-section-layout-areas {
                display: flex !important;
                flex-direction: column;
                grid-template-areas: none !important;
              }
              [data-layout-scope="${safe}"].theme-section-layout-areas > .theme-layout-cell {
                grid-area: unset !important;
                width: 100%;
              }
            }`,
          }}
        />
      ) : null}
      {mobileStack && !namedAreas ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `@media (max-width: 767px) { [data-layout-scope="${safe}"] > .theme-layout-cell { grid-column: 1 / -1 !important; } }`,
          }}
        />
      ) : null}
      <div style={gridStyle}>
        {list.map((b, i) => (
          <div
            key={`${b.type}-${i}`}
            className="theme-layout-cell min-w-0"
            style={gridCellStyle(desktopPlacement(b), cols, namedAreas)}
          >
            <BlockRenderer block={b} languageCode={languageCode} />
          </div>
        ))}
      </div>
    </div>
  );
}
