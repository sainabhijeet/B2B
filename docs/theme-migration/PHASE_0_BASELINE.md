# Theme Platform Migration — Phase 0 Baseline

Status: implemented as an additive, observation-only phase.

## Scope

Phase 0 establishes migration controls and a repeatable baseline. The current
theme tables, filesystem layout, API responses, queue payloads, and legacy
runtime remain authoritative. No release tables, object-storage copy, runtime
resolver, API cutover, builder change, or mobile client change is included.

## Migration controls

All controls default to `false` (and rollout to `0`) and are validated at
startup:

| Variable | Purpose in Phase 0 | Default |
| --- | --- | --- |
| `THEME_MIGRATION_DIAGNOSTICS_ENABLED` | Enables correlation headers and structured legacy theme telemetry | `false` |
| `THEME_MIGRATION_SHADOW_READS` | Reserved for a later read-comparison phase | `false` |
| `THEME_MIGRATION_DUAL_WRITE` | Reserved for the additive data-model phase | `false` |
| `THEME_MIGRATION_CANONICAL_RUNTIME` | Reserved for the runtime cutover phase | `false` |
| `THEME_MIGRATION_ROLLOUT_PERCENT` | Reserved rollout percentage; no Phase 0 code consumes it | `0` |

The first flag is intentionally opt-in. With all flags at their defaults,
production response bodies, headers, storage, database writes, and queue
behavior remain unchanged.

## Current contract freeze

The following legacy routes are frozen inputs to the migration work:

- `POST /themes/upload` — multipart theme package upload.
- `PATCH /themes/:themeId` — theme metadata update.
- `GET /themes` and `GET /themes/:themeId/manifest` — theme catalog and manifest reads.
- `POST /themes/select` — web, combo, or split web/mobile selection.
- `POST /distributor/themes/select` — distributor selection adapter, including mobile selection.
- `GET /themes/storefront/current` — public storefront resolution.
- `GET/POST /themes/tenant-content` and `GET/POST /themes/tenant-theme-tokens` — tenant customization.
- `POST /themes/tenant-media/upload` and `POST /themes/preview-media/upload` — media upload paths.

The response envelope (`success`, `data`, `meta`, `message`) and legacy table
writes are not changed by this phase. Any future contract change must add a
versioned endpoint or an explicitly documented compatibility adapter.

## Canonical ID and compatibility map

This map is a Phase 0 reference only; it does not create the target columns:

| Current source | Phase 0 canonical meaning | Future target |
| --- | --- | --- |
| `themes.id` | Legacy theme package identity | `theme_family_id` or compatibility `legacy_theme_id` |
| `themes.theme_version` | Legacy published package version | Immutable `theme_release.version` |
| `themes.theme_channel` | `WEB` or `MOBILE` delivery channel | Release channel/platform dimension |
| `tenant_theme_settings.web_theme_id` | Current web selection | Canonical deployment web release reference |
| `tenant_theme_settings.mobile_theme_id` | Current mobile selection | Canonical deployment mobile release reference |
| `tenant_theme_settings.combo_id` | Current paired selection | Deployment bundle/pair reference |
| `themes.storage_path` | Relative legacy runtime tree | Immutable object key/prefix |
| `tenant_theme_change` | Append-only selection history | Deployment audit/event history |

Until the target model exists, these legacy IDs are the only authoritative
identifiers. No Phase 0 log event presents a future ID as if it already exists.

## Observability contract

When diagnostics are enabled, the request middleware accepts safe incoming
`X-Correlation-Id` and `X-Request-Id` values or generates UUIDs. It returns
those values in response headers and includes the correlation ID in errors.

The legacy theme service emits JSON log events for:

- `theme.release.upload.requested|completed|failed`
- `theme.selection.requested|completed|failed`
- `theme.deployment.enqueue.requested|completed|failed`

Events contain phase, implementation, actor role, tenant/theme identifiers,
outcome, duration, and error type. They do not contain ZIP bytes, credentials,
request bodies, or filesystem paths.

Recommended dashboard panels can be built directly from these events:

- upload request, success, and failure counts by channel;
- upload failure rate and p50/p95 upload duration;
- selection failure rate by mode and actor role;
- deployment enqueue failures and queue latency;
- requests missing a correlation context when diagnostics are enabled.

These panels are observational only. No alert changes or external monitoring
resources are created by this repository phase.

## Inventory

Run the read-only inventory from `backend/` after configuring the existing
database environment:

```text
npm run themes:inventory
```

The command reports table counts, theme channel/status groupings, storage-path
coverage, runtime storage directories, extracted manifests, and archived ZIP
counts. It does not insert, update, delete, extract, or copy anything.

## Golden fixtures

`backend/test/fixtures/theme-migration/` contains minimal legacy WEB and MOBILE
manifest/template fixtures. They are reference inputs for future package
validation and migration tests; Phase 0 does not transform or publish them.

## Acceptance criteria

1. All migration flags are disabled in production configuration.
2. The legacy API, database writes, storage paths, and queue payloads remain the
   only production behavior.
3. Diagnostics can be enabled independently and correlated across API and
   theme-service logs.
4. Inventory can be rerun before every migration phase and compared as JSON.
5. Disabling diagnostics or reverting the deployment removes all Phase 0
   observable behavior without data repair.
