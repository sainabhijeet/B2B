# Theme Platform Migration — Phase 0 Rollback Runbook

Phase 0 is designed to roll back without data repair because it adds no schema
and does not change the legacy execution path.

## Immediate containment

1. Set `THEME_MIGRATION_DIAGNOSTICS_ENABLED=false` and restart/redeploy the
   affected backend instances. This removes migration headers and telemetry.
2. Confirm `THEME_MIGRATION_SHADOW_READS=false`,
   `THEME_MIGRATION_DUAL_WRITE=false`, and
   `THEME_MIGRATION_CANONICAL_RUNTIME=false`.
3. If the release itself is unhealthy, roll back the application artifact to
   the previous immutable backend artifact using the existing deployment
   mechanism.

## Verification

Run the existing smoke checks against:

- `GET /api/v1/themes/storefront/current`
- `GET /api/v1/themes`
- `GET /api/v1/themes/:themeId/manifest`
- the existing distributor theme selection flow in a non-production tenant

Then verify that no migration flag is enabled and that normal legacy logs,
theme storage directories, database rows, and build queue messages continue to
be produced as before.

## Data and storage safety

Phase 0 creates no migration tables, does not rewrite theme rows, and does not
copy or delete theme packages. No rollback SQL or storage cleanup is required.

If a later phase has enabled a flag unexpectedly, disable that flag first and
follow that phase's runbook before reverting its application artifact.
