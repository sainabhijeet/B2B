import { Injectable } from '@nestjs/common';
import { getMessaging } from 'firebase-admin/messaging';
import { FirebaseAdminLifecycleService } from '../../modules/system-config/firebase-admin-lifecycle.service';

@Injectable()
export class FirebaseIntegration {
  constructor(private readonly firebaseLifecycle: FirebaseAdminLifecycleService) {}

  private async getMessagingClient() {
    const app = await this.firebaseLifecycle.tryGetAppForMessaging();
    if (!app) return null;
    return getMessaging(app);
  }

  async sendPushNotification(
    _userId: string,
    title: string,
    message: string,
    tokens: string[] = [],
  ): Promise<void> {
    if (tokens.length === 0) return;
    const messaging = await this.getMessagingClient();
    if (!messaging) return;
    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: message,
      },
    });
  }

  async sendPushToTopic(topic: string, title: string, message: string): Promise<void> {
    const messaging = await this.getMessagingClient();
    if (!messaging) return;
    await messaging.send({
      topic,
      notification: {
        title,
        body: message,
      },
    });
  }
}
