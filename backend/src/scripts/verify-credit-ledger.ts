import 'dotenv/config';
import dataSource from '../database/data-source';

/**
 * Offline / cron-friendly check: cached `customers.credit_balance` vs SUM(`credit_transactions.amount`)
 * for customers that already have ledger rows. Exit code 1 if any mismatch (cap with LIMIT).
 */
async function run() {
  const take = Math.min(Math.max(parseInt(process.argv[2] ?? '200', 10) || 200, 1), 2000);
  await dataSource.initialize();
  try {
    const rows: Array<{ tenant_id: string; customer_id: string; cached: string; ledger_sum: string }> =
      await dataSource.query(
        `
        SELECT c.tenant_id AS tenant_id, c.id AS customer_id,
               c.credit_balance::text AS cached,
               COALESCE(SUM(t.amount), 0)::text AS ledger_sum
        FROM customers c
        INNER JOIN credit_transactions t ON t.customer_id = c.id AND t.tenant_id = c.tenant_id
        WHERE c.deleted_at IS NULL
        GROUP BY c.tenant_id, c.id, c.credit_balance
        HAVING c.credit_balance::numeric <> COALESCE(SUM(t.amount), 0)::numeric
        LIMIT $1
        `,
        [take],
      );
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ take, mismatchCount: rows.length, mismatches: rows }, null, 2));
    process.exit(rows.length > 0 ? 1 : 0);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

void run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
