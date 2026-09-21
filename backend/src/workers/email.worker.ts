import { Worker } from 'bullmq';
import { DataSource } from 'typeorm';
import { EmailService } from '../common/services/email.service';
import { logFailedJob, logWorkerEvent } from './worker-log.util';
import { QUEUE_NAMES } from './queues';
import { invoiceGeneratedTemplate } from '../templates/emails/invoice-generated.template';
import { orderConfirmationTemplate } from '../templates/emails/order-confirmation.template';
import { orderDispatchedTemplate } from '../templates/emails/order-dispatched.template';

export const createEmailWorker = (
  connection: { host: string; port: number },
  ds: DataSource,
  emailService: EmailService,
) =>
  new Worker(
    QUEUE_NAMES.email,
    async (job) => {
      const eventType = job.name;
      try {
        const targetEmail = String(job.data.email ?? '');
        if (!targetEmail) {
          await logWorkerEvent(ds, 'email_worker', eventType, 'FAILED', 'Missing recipient email');
          return;
        }

        const template = resolveEmailTemplate(eventType, job.data);
        await emailService.sendEmail(targetEmail, template.subject, template.text);
        await logWorkerEvent(ds, 'email_worker', eventType, 'SUCCESS');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logWorkerEvent(
          ds,
          'email_worker',
          eventType,
          'FAILED',
          errorMessage,
        );
        await logFailedJob(
          ds,
          'email_worker',
          QUEUE_NAMES.email,
          eventType,
          job.data as Record<string, unknown>,
          errorMessage,
        );
        throw error;
      }
    },
    { connection, concurrency: 5 },
  );

function resolveEmailTemplate(eventType: string, payload: Record<string, unknown>) {
  if (eventType === 'ORDER_CREATED') {
    return orderConfirmationTemplate(String(payload.orderId ?? payload.order_id ?? ''));
  }
  if (eventType === 'INVOICE_GENERATED') {
    return invoiceGeneratedTemplate(String(payload.invoiceId ?? payload.invoice_id ?? ''));
  }
  if (eventType === 'ORDER_DISPATCHED') {
    return orderDispatchedTemplate(String(payload.orderId ?? payload.order_id ?? ''));
  }
  return { subject: eventType, text: `Event: ${eventType}` };
}
