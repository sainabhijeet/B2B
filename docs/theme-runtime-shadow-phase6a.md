# Phase 6A Runtime Shadow Architecture

Phase 6A observes canonical runtime behavior without allowing canonical output to reach users. All flags default to disabled.

## Request sequence

```mermaid
sequenceDiagram
  participant U as Storefront Client
  participant L as Legacy Runtime
  participant I as Shadow Interceptor
  participant C as Canonical Resolver
  participant D as Healthy Deployment Snapshot
  participant X as Comparison Engine
  participant R as Comparison Report Store

  U->>L: Runtime request
  L-->>I: Legacy response
  I-->>U: Legacy response unchanged
  I-)C: Background shadow request
  C->>D: Read canonical snapshot only
  D-->>C: Published snapshot
  C-->>X: Canonical response/resources
  X->>X: Hash and compare categories
  X->>R: Store report when enabled
```

## Architecture

```mermaid
flowchart TB
  Legacy[Legacy ThemesService] --> Response[Legacy response]
  Response --> Return[Public response: legacy only]
  Response --> Interceptor[Non-blocking shadow interceptor]
  Interceptor --> Flags[Runtime feature flags]
  Flags --> Canonical[Canonical Runtime Resolver]
  Canonical --> Deployments[Healthy Phase 5 deployment snapshot]
  Canonical --> Compare[Runtime Comparison Engine]
  Compare --> Report[Structured comparison report]
  Report --> Store[(theme_runtime_comparison_reports)]
  Report --> Metrics[Runtime metrics and health]
```

## Comparison report format

```json
{
  "schemaVersion": 1,
  "requestId": "request-id",
  "tenantId": "tenant-id",
  "channel": "WEB",
  "status": "DIFFERENT",
  "legacyResponseHash": "sha256",
  "canonicalResponseHash": "sha256",
  "legacyDurationMs": 12,
  "canonicalDurationMs": 7,
  "added": [],
  "removed": [],
  "changed": [],
  "missing": [],
  "compatibilityWarnings": [],
  "generatedAt": "ISO-8601 timestamp"
}
```

Each difference includes a category (`theme`, `templates`, `sections`, `blocks`, `components`, `tokens`, `assets`, `locales`, or `runtimeConfiguration`), a relative path, and the applicable legacy/canonical value.

## Safety decisions

- The interceptor uses `tap`; it does not replace or transform the observable response.
- Shadow failures are caught and logged/metric-counted without affecting the request.
- Canonical resolution reads only healthy deployment snapshots, never legacy selection tables.
- Canonical runtime flags, report storage, metrics, and health are independently disabled by default.
- Runtime response hashes are diagnostic only; they never determine response selection.
