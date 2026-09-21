# Theme Customization Panel Architecture

This project follows a strict separation:

- Theme = layout + design tokens + default placeholders
- Tenant content = database overrides from admin panel

## Core Principles

- Theme ZIP must contain only JSON/CSS/images.
- React components stay inside `storefront-web`.
- Admin edits never mutate theme files.
- Runtime always merges:
  - theme defaults
  - tenant overrides

## Runtime Merge Contract

Storefront applies:

1. Load theme template from `theme.json -> templates/*.json`
2. Load tenant overrides from API (`/themes/storefront/current`)
3. Merge:

```ts
const settings = {
  ...themeDefaults,
  ...tenantOverrides,
};
```

4. Render using registry components.

## Data Model (Target)

- `tenant_sections`:
  - `tenant_id`, `page`, `section_key`, `settings_json`, `order_index`, `enabled`
- `tenant_media`:
  - `tenant_id`, `file_url`, `type`
- `tenant_theme_tokens`:
  - `tenant_id`, `color_primary`, `font_primary`, `border_radius`, etc.

## APIs (Target)

- `GET /themes/storefront/current`:
  - active theme + manifest path
  - tenant content overrides
  - tenant token overrides
- `PUT /website-builder/sections/:page`
- `PUT /website-builder/theme-tokens`
- `POST /website-builder/media/upload`

## Admin Panel Builder (Target)

- Sections list (drag-sort)
- Enable/disable sections
- Dynamic settings form generated from component schema JSON
- Media picker/uploader
- Live preview iframe

## Current Foundation Implemented

- Storefront supports tenant content override merge hook.
- Storefront supports tenant token override CSS vars hook.
- Backend storefront current response can include:
  - `contentOverrides`
  - `tokenOverrides`

This enables phased rollout of a Shopify-like editor without breaking the existing theme engine.
