import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { spawn } from 'node:child_process';
import { createSign } from 'crypto';

type GoogleServiceAccount = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

export type GoogleUploadInput = {
  serviceAccountJson: string;
  packageName: string;
  artifactPath: string;
  track: string;
  versionCode: number;
  releaseNotes: string | null;
};

export type AppleUploadInput = {
  issuerId: string;
  keyId: string;
  apiKey: string;
  bundleIdentifier: string;
  teamId: string | null;
  artifactPath: string;
  versionName: string;
  buildNumber: number;
};

export type AppleSubmitInput = Omit<AppleUploadInput, 'artifactPath' | 'buildNumber'> & {
  buildId: string;
  destination: 'TESTFLIGHT' | 'APP_REVIEW';
};

type AppleResource<T> = { id: string; type: string; attributes: T };
type AppleResponse<T> = { data: T };

@Injectable()
export class MobileReleaseProviderService {
  async uploadGooglePlay(input: GoogleUploadInput): Promise<{ releaseId: string; editId: string }> {
    const account = this.parseServiceAccount(input.serviceAccountJson);
    const token = await this.googleAccessToken(account);
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(input.packageName)}`;
    const edit = await this.googleJson<{ id: string }>(`${base}/edits`, token, { method: 'POST' });
    if (!edit.id) throw new BadRequestException('Google Play edit could not be created.');

    const bytes = await fs.readFile(input.artifactPath);
    const upload = await fetch(`${base}/edits/${edit.id}/bundles?uploadType=media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: bytes,
    });
    if (!upload.ok) throw new BadRequestException(await this.providerError(upload, 'Upload Failed'));

    await this.googleJson(`${base}/edits/${edit.id}/tracks/${encodeURIComponent(input.track)}`, token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releases: [
          {
            name: `${input.versionCode}`,
            versionCodes: [String(input.versionCode)],
            status: 'completed',
            releaseNotes: input.releaseNotes
              ? [{ language: 'en-US', text: input.releaseNotes.slice(0, 500) }]
              : undefined,
          },
        ],
      }),
    });
    await this.googleJson(`${base}/edits/${edit.id}:commit`, token, { method: 'POST' });
    return { releaseId: `${input.track}-${input.versionCode}`, editId: edit.id };
  }

  async uploadAppStore(input: AppleUploadInput): Promise<{ buildId: string; processingStatus: string }> {
    const uploadCommand = process.env.APP_STORE_CONNECT_UPLOAD_COMMAND?.trim();
    if (!uploadCommand) {
      throw new BadRequestException('Apple upload command is not configured.');
    }
    const token = this.createAppleJwt(input.issuerId, input.keyId, input.apiKey);
    const output = await this.runUploadCommand(uploadCommand, {
      APP_STORE_CONNECT_JWT: token,
      APP_STORE_CONNECT_ISSUER_ID: input.issuerId,
      APP_STORE_CONNECT_KEY_ID: input.keyId,
      APP_STORE_CONNECT_TEAM_ID: input.teamId ?? '',
      APP_STORE_CONNECT_BUNDLE_ID: input.bundleIdentifier,
      IPA_PATH: input.artifactPath,
    });
    const commandBuildId = this.buildIdFromCommandOutput(output);
    const build = commandBuildId
      ? await this.appleBuild(commandBuildId, token)
      : await this.waitForAppleBuild(input.bundleIdentifier, input.buildNumber, token);
    return {
      buildId: build.id,
      processingStatus: build.attributes.processingState || 'PROCESSING',
    };
  }

  async submitAppleBuild(input: AppleSubmitInput): Promise<{ processingStatus: string }> {
    const token = this.createAppleJwt(input.issuerId, input.keyId, input.apiKey);
    const build = await this.appleBuild(input.buildId, token);
    if (build.attributes.processingState !== 'VALID') {
      throw new BadRequestException(
        `Apple build is not ready. Current state: ${build.attributes.processingState || 'UNKNOWN'}`,
      );
    }
    if (input.destination === 'TESTFLIGHT') {
      return { processingStatus: 'TESTFLIGHT_READY' };
    }

    const appId = await this.appleAppId(input.bundleIdentifier, token);
    const versions = await this.appleJson<
      AppleResponse<Array<AppleResource<{ appStoreState?: string; versionString?: string }>>>
    >(
      `/appStoreVersions?filter[app]=${encodeURIComponent(appId)}&filter[versionString]=${encodeURIComponent(input.versionName)}&filter[platform]=IOS&limit=10`,
      token,
      { method: 'GET' },
    );
    const version = versions.data.find(
      (candidate) => candidate.attributes.versionString === input.versionName,
    );
    if (!version) {
      throw new BadRequestException(
        `App Store version ${input.versionName} does not exist in App Store Connect.`,
      );
    }

    await this.appleJson(
      `/appStoreVersions/${encodeURIComponent(version.id)}/relationships/build`,
      token,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'builds', id: input.buildId } }),
      },
    );
    await this.appleJson('/appStoreVersionSubmissions', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'appStoreVersionSubmissions',
          relationships: {
            appStoreVersion: {
              data: { type: 'appStoreVersions', id: version.id },
            },
          },
        },
      }),
    });
    return { processingStatus: 'SUBMITTED_FOR_REVIEW' };
  }

  private async appleAppId(bundleIdentifier: string, token: string): Promise<string> {
    const response = await this.appleJson<
      AppleResponse<Array<AppleResource<{ bundleId?: string }>>>
    >(`/apps?filter[bundleId]=${encodeURIComponent(bundleIdentifier)}&limit=1`, token, {
      method: 'GET',
    });
    const appId = response.data[0]?.id;
    if (!appId) throw new BadRequestException('Bundle identifier was not found in App Store Connect.');
    return appId;
  }

  private async appleBuild(
    buildId: string,
    token: string,
  ): Promise<AppleResource<{ processingState?: string; version?: string }>> {
    const response = await this.appleJson<
      AppleResponse<AppleResource<{ processingState?: string; version?: string }>>
    >(`/builds/${encodeURIComponent(buildId)}`, token, { method: 'GET' });
    if (!response.data?.id) throw new BadRequestException('Apple build was not found.');
    return response.data;
  }

  private async waitForAppleBuild(
    bundleIdentifier: string,
    buildNumber: number,
    token: string,
  ): Promise<AppleResource<{ processingState?: string; version?: string }>> {
    const appId = await this.appleAppId(bundleIdentifier, token);
    const attempts = this.boundedInteger(process.env.APP_STORE_BUILD_LOOKUP_ATTEMPTS, 18, 1, 60);
    const delayMs = this.boundedInteger(process.env.APP_STORE_BUILD_LOOKUP_DELAY_MS, 10000, 1000, 60000);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await this.appleJson<
        AppleResponse<Array<AppleResource<{ processingState?: string; version?: string }>>>
      >(
        `/builds?filter[app]=${encodeURIComponent(appId)}&filter[version]=${encodeURIComponent(String(buildNumber))}&sort=-uploadedDate&limit=1`,
        token,
        { method: 'GET' },
      );
      if (response.data[0]) return response.data[0];
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new BadRequestException(
      'Upload completed, but App Store Connect did not expose the build before the lookup timeout.',
    );
  }

  private buildIdFromCommandOutput(output: string): string | null {
    const trimmed = output.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as { buildId?: unknown };
      if (typeof parsed.buildId === 'string' && /^[0-9a-f-]{36}$/i.test(parsed.buildId)) {
        return parsed.buildId;
      }
    } catch {
      // Upload tools commonly emit regular text rather than JSON.
    }
    const match = trimmed.match(/(?:APP_STORE_BUILD_ID|buildId)\s*[=:]\s*([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
  }

  private boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  private parseServiceAccount(raw: string): GoogleServiceAccount {
    try {
      const parsed = JSON.parse(raw) as GoogleServiceAccount;
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error('missing fields');
      }
      return parsed;
    } catch {
      throw new BadRequestException('Google Authentication Failed');
    }
  }

  private async googleAccessToken(account: GoogleServiceAccount): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const assertion = [
      base64UrlJson({ alg: 'RS256', typ: 'JWT' }),
      base64UrlJson({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: account.token_uri || 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    ].join('.');
    const signature = createSign('RSA-SHA256').update(assertion).sign(account.private_key!, 'base64url');
    const res = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${assertion}.${signature}`,
      }),
    });
    if (!res.ok) throw new BadRequestException(await this.providerError(res, 'Google Authentication Failed'));
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) throw new BadRequestException('Google Authentication Failed');
    return body.access_token;
  }

  private async googleJson<T>(url: string, token: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new BadRequestException(await this.providerError(res, 'Upload Failed'));
    return (await res.json().catch(() => ({}))) as T;
  }

  private createAppleJwt(issuerId: string, keyId: string, apiKey: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = base64UrlJson({ iss: issuerId, aud: 'appstoreconnect-v1', exp: now + 1200, iat: now });
    const header = base64UrlJson({ alg: 'ES256', kid: keyId, typ: 'JWT' });
    try {
      const signature = createSign('SHA256').update(`${header}.${payload}`).sign(apiKey, 'base64url');
      return `${header}.${payload}.${signature}`;
    } catch {
      throw new BadRequestException('Invalid API Key');
    }
  }

  private async runUploadCommand(command: string, env: NodeJS.ProcessEnv): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(command, [], {
        shell: true,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let err = '';
      let out = '';
      child.stdout?.on('data', (chunk) => {
        out += String(chunk);
      });
      child.stderr?.on('data', (chunk) => {
        err += String(chunk);
      });
      child.on('close', (code) => {
        if (code === 0) resolve(out.slice(-4000));
        else reject(new BadRequestException(err.slice(-1000) || 'Apple Authentication Failed'));
      });
      child.on('error', () => reject(new BadRequestException('Apple Authentication Failed')));
    });
  }

  private async appleJson<T = Record<string, never>>(
    path: string,
    token: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new BadRequestException(await this.providerError(response, 'App Store Connect request failed'));
    }
    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  private async providerError(res: Response, fallback: string): Promise<string> {
    const text = await res.text().catch(() => '');
    if (!text) return fallback;
    try {
      const body = JSON.parse(text) as { error?: { message?: string }; message?: string };
      return body.error?.message || body.message || fallback;
    } catch {
      return text.slice(0, 500) || fallback;
    }
  }
}

function base64UrlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}
