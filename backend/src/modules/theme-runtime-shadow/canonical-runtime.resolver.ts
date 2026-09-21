import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  RuntimeCategory,
  RuntimeChannel,
  CanonicalRuntimeResult,
} from './runtime-contracts';
import { hashRuntimeResponse } from './runtime-comparison.engine';

@Injectable()
export class CanonicalRuntimeResolver {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolve(
    tenantId: string,
    channel: RuntimeChannel,
    signal?: AbortSignal,
  ): Promise<CanonicalRuntimeResult | null> {
    if (signal?.aborted) return null;
    const rows = await this.dataSource.query(
      `
        SELECT d.id AS "deploymentId", d.version_graph_json AS "versionGraph",
               s.snapshot_hash AS "snapshotHash", s.snapshot_json AS "snapshot"
        FROM "theme_enterprise_deployments" d
        JOIN "theme_deployment_snapshots" s ON s.deployment_id = d.id
        JOIN LATERAL (
          SELECT e.to_state FROM "theme_deployment_events" e
          WHERE e.deployment_id = d.id ORDER BY e.sequence DESC LIMIT 1
        ) latest ON TRUE
        WHERE d.tenant_id = $1
          AND d.channel IN ($2, 'COMBINED')
          AND d.environment = 'PRODUCTION'
          AND latest.to_state = 'HEALTHY'
        ORDER BY d.created_at DESC
        LIMIT 1
      `,
      [tenantId, channel],
    );
    const row = rows[0] as
      | {
          deploymentId: string;
          snapshotHash: string;
          snapshot: Record<string, unknown>;
        }
      | undefined;
    if (!row || signal?.aborted) return null;
    const snapshot = row.snapshot ?? {};
    const manifest =
      (snapshot.manifest as Record<string, unknown> | undefined) ?? {};
    const resources = this.resources(manifest, channel);
    const response =
      channel === 'WEB'
        ? this.webResponse(snapshot, manifest)
        : this.mobileResponse(snapshot, manifest);
    return {
      response,
      resources,
      responseHash: hashRuntimeResponse(response),
      deploymentId: row.deploymentId,
      snapshotHash: row.snapshotHash,
    };
  }

  private resources(
    manifest: Record<string, unknown>,
    channel: RuntimeChannel,
  ): Record<RuntimeCategory, unknown> {
    const empty: Record<RuntimeCategory, unknown> = {
      theme: {},
      templates: {},
      sections: {},
      blocks: {},
      components: {},
      tokens: {},
      assets: {},
      locales: {},
      runtimeConfiguration: {},
    };
    return {
      ...empty,
      theme: {
        name: manifest.name ?? null,
        version: manifest.version ?? null,
        channel,
      },
      templates: manifest.templates ?? {},
      sections: manifest.sections ?? manifest.allowedSections ?? {},
      blocks: manifest.blocks ?? {},
      components: manifest.components ?? {},
      tokens: manifest.tokens ?? {},
      assets: manifest.assets ?? {},
      locales: manifest.locales ?? manifest.languages ?? {},
      runtimeConfiguration:
        manifest.runtimeConfiguration ?? manifest.runtime ?? {},
    };
  }

  private webResponse(
    snapshot: Record<string, unknown>,
    manifest: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      success: true,
      data: {
        storefrontKey: manifest.storefrontKey ?? 'jewellery',
        themeEngine: 'registry-v1',
        contentOverrides: { pages: {} },
        tokenOverrides: {},
        webTheme: {
          id: String(snapshot.candidateId ?? ''),
          slug: String(manifest.storefrontKey ?? ''),
          themeName: String(manifest.name ?? ''),
          manifestPath: null,
        },
        branding: {
          logoUrl: null,
          logoDataUrl: null,
          tagline: null,
          primaryColor: null,
          secondaryColor: null,
          industryId: null,
          industryName: null,
        },
      },
      meta: {},
      message: '',
    };
  }

  private mobileResponse(
    snapshot: Record<string, unknown>,
    manifest: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      success: true,
      data: {
        theme_id: String(snapshot.candidateId ?? ''),
        theme_slug: String(manifest.storefrontKey ?? ''),
        theme_name: String(manifest.name ?? ''),
        base_layout: 'canonical-shadow',
        config: manifest.runtimeConfiguration ?? {},
        branding: {},
        preview: null,
      },
      meta: {},
      message: '',
    };
  }
}
