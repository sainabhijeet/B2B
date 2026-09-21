import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../common/services/email.service';
import { FirebaseIntegration } from '../integrations/firebase/firebase.integration';
import { FirebaseAdminLifecycleService } from '../modules/system-config/firebase-admin-lifecycle.service';
import { createAnalyticsWorker } from './analytics.worker';
import { createBuildWorker } from './build.worker';
import { createEmailWorker } from './email.worker';
import { createNotificationWorker } from './notification.worker';
import { startSubscriptionWorker } from './subscription.worker';
import { getWorkerDataSource } from './worker-data-source';

const connection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

async function bootstrapWorkers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = await getWorkerDataSource();
  const emailService = app.get(EmailService);
  const firebaseLifecycle = app.get(FirebaseAdminLifecycleService);
  const firebaseIntegration = app.get(FirebaseIntegration);

  createNotificationWorker(connection, ds, firebaseIntegration);
  createAnalyticsWorker(connection, ds);
  createBuildWorker(connection, ds);
  createEmailWorker(connection, ds, emailService);
  startSubscriptionWorker(connection, ds);
}

bootstrapWorkers().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Worker bootstrap failed:', error);
  process.exit(1);
});
