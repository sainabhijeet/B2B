import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { Subscription } from '../common/entities/subscription.entity';
import { QUEUE_NAMES } from './queues';

type RedisConnection = { host: string; port: number };

export function startSubscriptionWorker(connection: RedisConnection, ds: DataSource) {
  const notificationsQueue = new Queue(QUEUE_NAMES.notification, { connection });

  const run = async () => {
    const repo = ds.getRepository(Subscription);
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDayDate = sevenDaysLater.toISOString().slice(0, 10);

    const expiringSoon = await repo
      .createQueryBuilder('s')
      .where("s.status IN ('ACTIVE','TRIAL')")
      .andWhere('s.end_date IS NOT NULL')
      .andWhere('s.end_date = :sevenDayDate', { sevenDayDate })
      .andWhere(
        '(s.last_expiry_reminder_sent_at IS NULL OR (s.last_expiry_reminder_sent_at)::date < CURRENT_DATE)',
      )
      .getMany();

    for (const sub of expiringSoon) {
      if (!sub.tenantId) continue;
      sub.lastExpiryReminderSentAt = new Date();
      await repo.save(sub);
      await notificationsQueue.add('subscription_expiry_reminder', {
        tenantId: sub.tenantId,
        target: { mode: 'topic', topic: `tenant_${sub.tenantId}` },
        type: 'SYSTEM_ALERT',
        title: 'Subscription expiring soon',
        message: 'Your subscription expires in less than 7 days.',
      });
    }

    const expired = await repo
      .createQueryBuilder('s')
      .where("s.status IN ('ACTIVE','TRIAL')")
      .andWhere('s.end_date IS NOT NULL')
      .andWhere('s.end_date < :today', { today })
      .getMany();

    for (const sub of expired) {
      sub.status = 'EXPIRED';
      await repo.save(sub);
    }
  };

  void run();
  const timer = setInterval(() => void run(), 24 * 60 * 60 * 1000);
  timer.unref();
}
