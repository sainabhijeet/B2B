import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { cert, deleteApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import type { FirebaseAdminStored } from './platform-settings.service';
import { PlatformSettingsService } from './platform-settings.service';

const APP_NAME = 'saas-platform-admin';

@Injectable()
export class FirebaseAdminLifecycleService {
  private app: App | null = null;
  private fingerprint: string | null = null;

  constructor(private readonly platformSettings: PlatformSettingsService) {}

  async invalidate(): Promise<void> {
    const existing = getApps().find((a) => a.name === APP_NAME);
    if (existing) {
      await deleteApp(existing);
    }
    this.app = null;
    this.fingerprint = null;
  }

  async getAppForAuth(): Promise<App> {
    const c = await this.platformSettings.getFirebaseAdminStored();
    if (c.status !== 'active') {
      throw new ServiceUnavailableException(
        'Firebase Admin is disabled. Enable it under Integrations → Push notification providers.',
      );
    }
    if (!c.projectId.trim() || !c.clientEmail.trim() || !c.privateKey.trim()) {
      throw new ServiceUnavailableException(
        'Firebase Admin is not configured. Add the service account under Integrations → Push (Firebase Cloud Messaging).',
      );
    }
    return this.ensureApp(c);
  }

  async tryGetAppForMessaging(): Promise<App | null> {
    const c = await this.platformSettings.getFirebaseAdminStored();
    if (c.status !== 'active') return null;
    if (!c.projectId.trim() || !c.clientEmail.trim() || !c.privateKey.trim()) return null;
    return this.ensureApp(c);
  }

  private async ensureApp(c: FirebaseAdminStored): Promise<App> {
    const privateKey = c.privateKey.replace(/\\n/g, '\n');
    const fp = `${c.projectId.trim()}|${c.clientEmail.trim()}|${privateKey.length}`;
    if (this.app && this.fingerprint === fp) {
      return this.app;
    }
    await this.invalidate();
    this.app = initializeApp(
      {
        credential: cert({
          projectId: c.projectId.trim(),
          clientEmail: c.clientEmail.trim(),
          privateKey,
        }),
      },
      APP_NAME,
    );
    this.fingerprint = fp;
    return this.app;
  }
}
