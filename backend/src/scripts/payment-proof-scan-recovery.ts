import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaymentProofScanRecoveryService } from '../modules/media/payment-proof-scan-recovery.service';

function numberArg(name: string): number | undefined {
  const prefix = `${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return undefined;
  const parsed = Number(raw.slice(prefix.length));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const olderThanMs = numberArg('--older-than-ms');
  const limitPerTenant = numberArg('--limit-per-tenant');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const service = app.get(PaymentProofScanRecoveryService);
    const result = await service.recover({
      apply,
      olderThanMs,
      limitPerTenant,
    });

    console.log(
      JSON.stringify(
        {
          mode: result.mode,
          tenantsChecked: result.tenantsChecked,
          candidateCount: result.candidateCount,
          skippedCount: result.skippedCount,
          enqueuedCount: result.enqueuedCount,
          failureCount: result.failures.length,
          candidates: result.candidates.map((candidate) => ({
            tenantId: candidate.tenantId,
            tenantSlug: candidate.tenantSlug,
            storageObjectId: candidate.storageObjectId,
            orderPaymentId: candidate.orderPaymentId,
            orderId: candidate.orderId,
          })),
          failures: result.failures,
        },
        null,
        2,
      ),
    );

    if (result.failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error && error.message.trim()
      ? error.message.slice(0, 200)
      : 'Payment-proof scan recovery failed.',
  );
  process.exitCode = 1;
});
