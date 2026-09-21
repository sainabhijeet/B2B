import AdmZip = require('adm-zip');
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getBackendStorageRoot } from './../src/common/utils/storage-root';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import dataSource from './../src/database/data-source';

describe('Critical smoke (e2e)', () => {
  let app: NestExpressApplication;
  let superAdminToken = '';
  let tenantId = '';
  let categoryId = '';
  let productId = '';
  let buildId = '';
  let subscriptionId = '';
  let paymentId = '';
  let themeZipPath = '';

  beforeAll(async () => {
    process.env.OTP_FIXED_CODE_ENABLED = 'true';

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    try {
      await dataSource.runMigrations();
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(getBackendStorageRoot(), { prefix: '/storage/' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (themeZipPath) await fs.rm(themeZipPath, { force: true });
  });

  it('health check', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body?.success).toBe(true);
      });
  });

  it('admin login works', async () => {
    const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? 'admin@platform.com';
    const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? 'Admin@1234';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ email, password, deviceId: 'smoke-super-admin-device' })
      .expect(201);
    superAdminToken = res.body?.accessToken;
    expect(superAdminToken).toBeDefined();
  });

  it('theme zip upload works (super admin)', async () => {
    expect(superAdminToken).toBeTruthy();
    const exampleDir = join(__dirname, '..', 'scripts', 'example-theme-pack');
    themeZipPath = join(tmpdir(), `e2e-theme-${Date.now()}.zip`);
    const zip = new AdmZip();
    zip.addLocalFolder(exampleDir);
    zip.writeZip(themeZipPath);
    const slug = `e2e-theme-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/themes/upload')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('themeName', 'E2E Example Theme')
      .field('themeType', 'generic')
      .field('platform', 'web')
      .field('version', '1.0')
      .field('status', 'ACTIVE')
      .field('slug', slug)
      .attach('file', themeZipPath);
    expect([200, 201]).toContain(res.status);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.slug).toBe(slug);
  });

  it('tenant creation works', async () => {
    const now = Date.now();
    const slug = `smoke-${now}`;
    const ownerEmail = `owner-${now}@example.com`;
    const ownerPassword = 'Owner@1234';
    const createTenant = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        slug,
        name: `Smoke Tenant ${now}`,
        ownerEmail,
        ownerPassword,
        ownerPhone: '9999999999',
      })
      .expect(201);
    tenantId = createTenant.body?.id;
    expect(tenantId).toBeDefined();

  });

  it('product catalog flow works', async () => {
    const createCategory = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ tenantId, name: 'Smoke Category', slug: `smoke-cat-${Date.now()}` })
      .expect(201);
    categoryId = createCategory.body?.data?.id;
    expect(categoryId).toBeDefined();

    const createProduct = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        tenantId,
        name: 'Smoke Product',
        slug: `smoke-product-${Date.now()}`,
        sku: `SMK-${Date.now()}`,
        description: 'Smoke product description',
        categoryId,
        price: '100',
        mrp: '120',
        taxRate: '18',
      })
      .expect(201);
    productId = createProduct.body?.data?.id;
    expect(productId).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        productId,
        variantId: null,
        stockQuantity: 25,
        lowStockThreshold: 5,
      })
      .expect(201);
  });

  it('storefront retailer registration creates a pending account', async () => {
    const mobile = `8${String(Date.now()).slice(-9)}`;
    const register = await request(app.getHttpServer())
      .post('/api/v1/storefront/customer/register')
      .set('X-Tenant-Id', tenantId)
      .send({
        companyName: 'Smoke Retailer',
        mobile,
        email: `retailer-${Date.now()}@example.com`,
      })
      .expect(201);
    expect(register.body?.success).toBe(true);
    expect(register.body?.data?.status).toBe('INACTIVE');

    await request(app.getHttpServer())
      .post('/api/v1/storefront/customer/login')
      .set('X-Tenant-Id', tenantId)
      .send({ mobile })
      .expect(403);
  });

  it('storefront contact inquiry reaches tenant support', async () => {
    const inquiry = await request(app.getHttpServer())
      .post('/api/v1/storefront/support/inquiries')
      .set('X-Tenant-Id', tenantId)
      .send({
        name: 'Smoke Buyer',
        email: `buyer-${Date.now()}@example.com`,
        subject: 'Order assistance',
        message: 'Please help me with a storefront order question.',
      })
      .expect(201);
    expect(inquiry.body?.success).toBe(true);
    expect(inquiry.body?.data?.status).toBe('OPEN');
  });

  it('admin can view real tenant usage counters', async () => {
    const usage = await request(app.getHttpServer())
      .get(`/api/v1/tenants/${tenantId}/usage`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(usage.body?.success).toBe(true);
    expect(usage.body?.data?.products).toBeGreaterThanOrEqual(1);
    expect(usage.body?.data?.customers).toBeGreaterThanOrEqual(1);
    expect(usage.body?.data?.apiCalls30d).toBeGreaterThanOrEqual(0);
  });

  it('order endpoints enforce tenant-user context', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ productId, quantity: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({})
      .expect(403);
  });

  it('build trigger flow works', async () => {
    const createBuild = await request(app.getHttpServer())
      .post('/api/v1/builds')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        tenantId,
        buildType: 'ANDROID_AAB',
        packageName: `com.smoke.${Date.now()}`,
        appName: 'Smoke Build App',
        languages: ['en'],
      })
      .expect(201);
    buildId = createBuild.body?.data?.id;
    expect(buildId).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/builds/${buildId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/builds?tenantId=${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body?.data?.some((row: { id: string }) => row.id === buildId)).toBe(true);
      });
  });

  it('notification endpoint enforces tenant context', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        targetType: 'single_user',
        userId: '00000000-0000-0000-0000-000000000000',
        title: 'Smoke Notification',
        message: 'Smoke notification message',
      })
      .expect(403);
  });

  it('protected route requires auth', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/random').expect(401);
  });

  it('billing flow works for tenant via super admin context', async () => {
    const plansRes = await request(app.getHttpServer())
      .get('/api/v1/billing/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    const plans = plansRes.body?.data ?? [];
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
    const planId = plans.find((p: any) => p.code === 'BASIC')?.id ?? plans[0]?.id;
    expect(planId).toBeDefined();

    const subscribeRes = await request(app.getHttpServer())
      .post('/api/v1/billing/subscribe')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ tenantId, planId })
      .expect(201);
    subscriptionId = subscribeRes.body?.data?.id;
    expect(subscriptionId).toBeDefined();

    const paymentRes = await request(app.getHttpServer())
      .post('/api/v1/billing/payments')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        tenantId,
        subscriptionId,
        paymentMethod: 'UPI',
        transactionReference: `UPI-${Date.now()}`,
      })
      .expect(201);
    paymentId = paymentRes.body?.data?.id;
    expect(paymentId).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/billing/invoices/generate?tenantId=${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body?.data?.pdfUrl).toBeDefined();
      });

    await request(app.getHttpServer())
      .patch('/api/v1/admin/billing/subscriptions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        subscriptionId,
        action: 'EXTEND',
        endDate: '2099-12-31',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/admin/billing/payments/mark')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        paymentId,
        paymentStatus: 'SUCCESS',
      })
      .expect(201);
  });

  it('admin referral endpoints are accessible', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/referrals')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/admin/referrals/conversions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/admin/referrals/commissions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
  });
});
