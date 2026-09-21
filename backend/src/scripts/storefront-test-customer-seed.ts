/**
 * Idempotent storefront OTP test customer (must exist before `/storefront/customer/login`).
 *
 *   npm run storefront:test-customer:seed
 *
 * Env (optional):
 *   STOREFRONT_TEST_TENANT_SLUG   default acme-retail  (matches `npm run tenants:seed`)
 *   STOREFRONT_TEST_CUSTOMER_MOBILE default 9999999999
 *   STOREFRONT_TEST_CUSTOMER_NAME   default Storefront Test Customer
 *
 * OTP must be delivered by the configured SMS provider; fixed development OTP is disabled.
 */
import 'dotenv/config';
import { IsNull } from 'typeorm';
import dataSource from '../database/data-source';
import { Customer } from '../common/entities/customer.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { CustomerStatus } from '../common/enums/customer-status.enum';

async function run() {
  const slug = (process.env.STOREFRONT_TEST_TENANT_SLUG ?? 'acme-retail').trim();
  const mobile = (process.env.STOREFRONT_TEST_CUSTOMER_MOBILE ?? '9999999999').replace(/\D/g, '');
  const name = (process.env.STOREFRONT_TEST_CUSTOMER_NAME ?? 'Storefront Test Customer').trim() || 'Storefront Test Customer';

  if (mobile.length < 8 || mobile.length > 20) {
    throw new Error(`Invalid STOREFRONT_TEST_CUSTOMER_MOBILE (need 8–20 digits): ${mobile}`);
  }

  await dataSource.initialize();
  const tenantRepo = dataSource.getRepository(Tenant);
  const customerRepo = dataSource.getRepository(Customer);

  const tenant = await tenantRepo.findOne({ where: { slug } });
  if (!tenant) {
    throw new Error(
      `Tenant slug "${slug}" not found. Run migrations + \`npm run tenants:seed\`, or set STOREFRONT_TEST_TENANT_SLUG to an existing tenant.`,
    );
  }

  const existing = await customerRepo.findOne({
    where: { tenantId: tenant.id, mobile, deletedAt: IsNull() },
  });
  if (existing) {
    console.log(
      `[storefront-test-customer-seed] ok tenant=${slug} mobile=${mobile} (already exists id=${existing.id})`,
    );
    await dataSource.destroy();
    return;
  }

  const row = await customerRepo.save(
    customerRepo.create({
      tenantId: tenant.id,
      name,
      mobile,
      email: null,
      status: CustomerStatus.ACTIVE,
      creditLimit: '0',
      creditBalance: '0',
    }),
  );
  console.log(`[storefront-test-customer-seed] created id=${row.id} tenant=${slug} mobile=${mobile}`);
  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
