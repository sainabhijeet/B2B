import { Worker } from 'bullmq';
import { DataSource, In } from 'typeorm';
import { Notification } from '../common/entities/notification.entity';
import { AnalyticsEvent } from '../common/entities/analytics-event.entity';
import { TenantPushConfig } from '../common/entities/tenant-push-config.entity';
import { UserDeviceToken } from '../common/entities/user-device-token.entity';
import { FirebaseIntegration } from '../integrations/firebase/firebase.integration';
import { logFailedJob, logWorkerEvent } from './worker-log.util';
import { QUEUE_NAMES } from './queues';

export const createNotificationWorker = (
  connection: { host: string; port: number },
  ds: DataSource,
  firebaseIntegration: FirebaseIntegration,
) =>
  new Worker(
    QUEUE_NAMES.notification,
    async (job) => {
      const eventType = job.name;
      try {
        const notificationRepo = ds.getRepository(Notification);
        const analyticsRepo = ds.getRepository(AnalyticsEvent);
        const deviceTokenRepo = ds.getRepository(UserDeviceToken);
        const tenantPushConfigRepo = ds.getRepository(TenantPushConfig);

        const tenantId = String(job.data.tenantId ?? job.data.tenant_id ?? '');
        const targetType = String(job.data.targetType ?? 'single_user');
        const userId = String(job.data.userId ?? job.data.user_id ?? '');
        const userIds = Array.isArray(job.data.userIds)
          ? (job.data.userIds as string[])
          : [];
        const topic = String(job.data.topic ?? '');
        const entityId = String(
          job.data.orderId ?? job.data.order_id ?? job.data.invoiceId ?? '',
        );
        const customTitle =
          typeof job.data.title === 'string' ? job.data.title : undefined;
        const customMessage =
          typeof job.data.message === 'string' ? job.data.message : undefined;
        const actionUrl =
          typeof job.data.actionUrl === 'string' ? job.data.actionUrl : null;
        const entityType =
          typeof job.data.entityType === 'string' ? job.data.entityType : null;

        const pushConfig = await tenantPushConfigRepo.findOne({
          where: { tenantId },
        });
        if (pushConfig && !pushConfig.enabled) {
          await logWorkerEvent(ds, 'notification_worker', eventType, 'SUCCESS');
          return;
        }

        const content = resolveNotificationContent(
          eventType,
          entityId,
          customTitle,
          customMessage,
        );
        if (targetType === 'topic') {
          if (!topic) throw new Error('Topic target requires topic value.');
          await firebaseIntegration.sendPushToTopic(
            topic,
            content.title,
            content.message,
          );
        } else {
          const targetUserIds =
            targetType === 'multiple_users'
              ? userIds
              : [userId].filter(Boolean);
          const tokenRows = await deviceTokenRepo.find({
            where: {
              tenantId,
              userId:
                targetUserIds.length > 1 ? In(targetUserIds) : targetUserIds[0],
              status: 'active',
            },
          });
          const tokens = [...new Set(tokenRows.map((t) => t.token))];
          await firebaseIntegration.sendPushNotification(
            userId,
            content.title,
            content.message,
            tokens,
          );
          if (targetUserIds.length > 0) {
            await Promise.all(
              targetUserIds.map((uid) =>
                notificationRepo.save(
                  notificationRepo.create({
                    tenantId,
                    userId: uid,
                    type: eventType,
                    title: content.title,
                    message: content.message,
                    status: 'SENT',
                    entityType,
                    entityId: entityId || null,
                    actionUrl,
                    metadataJson: job.data.metadata ?? {},
                    readAt: null,
                  }),
                ),
              ),
            );
          }
        }

        await analyticsRepo.save(
          analyticsRepo.create({
            tenantId,
            userId: userId || null,
            eventType: 'NOTIFICATION_SENT',
            entityType: eventType,
            entityId: entityId || null,
            metadataJson: { sourceEvent: eventType },
          }),
        );
        await logWorkerEvent(ds, 'notification_worker', eventType, 'SUCCESS');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        await logWorkerEvent(
          ds,
          'notification_worker',
          eventType,
          'FAILED',
          errorMessage,
        );
        await logFailedJob(
          ds,
          'notification_worker',
          QUEUE_NAMES.notification,
          eventType,
          job.data as Record<string, unknown>,
          errorMessage,
        );
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

function resolveNotificationContent(
  eventType: string,
  entityId: string,
  customTitle?: string,
  customMessage?: string,
) {
  if (customTitle && customMessage) {
    return { title: customTitle, message: customMessage };
  }
  switch (eventType) {
    case 'ORDER_CREATED':
      return {
        title: 'Order placed',
        message: 'Your order has been placed successfully.',
      };
    case 'PAYMENT_UPLOADED':
      return {
        title: 'Payment uploaded',
        message: 'Your payment proof has been uploaded.',
      };
    case 'ORDER_PROCESSING':
      return {
        title: 'Payment received',
        message: 'Your payment has been verified. Order is now processing.',
      };
    case 'ORDER_ACCEPTED':
      return {
        title: 'Order accepted',
        message: 'Your order has been accepted and is now processing.',
      };
    case 'ORDER_PENDING':
      return {
        title: 'Order pending',
        message: 'Your order is pending.',
      };
    case 'PAYMENT_REJECTED':
      return {
        title: 'Payment proof rejected',
        message:
          'Your payment proof could not be verified. Open the order and submit a valid proof.',
      };
    case 'INVOICE_GENERATED':
      return {
        title: 'Invoice generated',
        message: `Invoice generated for reference ${entityId}.`,
      };
    case 'ORDER_DISPATCHED':
      return {
        title: 'Order dispatched',
        message: 'Your order has been dispatched.',
      };
    case 'ORDER_DELIVERED':
      return {
        title: 'Order delivered',
        message: 'Your order has been delivered.',
      };
    case 'ORDER_CANCELLED':
      return {
        title: 'Order cancelled',
        message: 'Your order has been cancelled.',
      };
    default:
      return { title: eventType, message: `Event received: ${eventType}` };
  }
}
