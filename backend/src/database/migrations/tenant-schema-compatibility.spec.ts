import type { QueryRunner } from 'typeorm';
import { OrderRequests1712600181000 } from './1712600181000-OrderRequests';
import { TenantCoupons1712600183000 } from './1712600183000-TenantCoupons';

type QueryHandler = (sql: string) => unknown[] | Promise<unknown[]>;

function createQueryRunner(handler: QueryHandler): {
  queryRunner: QueryRunner;
  queries: string[];
} {
  const queries: string[] = [];
  return {
    queries,
    queryRunner: {
      query: jest.fn((sql: string) => {
        queries.push(sql);
        return Promise.resolve(handler(sql));
      }),
    } as unknown as QueryRunner,
  };
}

describe('tenant-aware migration compatibility', () => {
  it('creates public order_requests and provisioned tenant order_requests only', async () => {
    const migration = new OrderRequests1712600181000();
    const { queryRunner, queries } = createQueryRunner((sql) => {
      if (sql.includes('FROM public.tenants')) {
        return [{ schema_name: 't_11111111111111111111111111111111' }];
      }
      return [];
    });

    await migration.up(queryRunner);

    const allQueries = queries.join('\n');
    expect(allQueries).toContain(
      'CREATE TABLE IF NOT EXISTS "public"."order_requests"',
    );
    expect(allQueries).toContain(
      'CREATE TABLE IF NOT EXISTS "t_11111111111111111111111111111111"."order_requests"',
    );
    expect(allQueries).toContain('tenant_schema_provisioned = true');
    expect(allQueries).toContain('to_regnamespace(schema_name) IS NOT NULL');
    expect(allQueries).not.toContain('t_22222222222222222222222222222222');
  });

  it('does not create tenant coupon tables for registered tenants whose schemas are missing', async () => {
    const migration = new TenantCoupons1712600183000();
    const { queryRunner, queries } = createQueryRunner((sql) => {
      if (sql.includes("to_regclass('public.tenants')")) {
        return [{ regclass: 'tenants' }];
      }
      if (sql.includes('FROM public.tenants')) {
        return [];
      }
      return [];
    });

    await migration.up(queryRunner);

    const allQueries = queries.join('\n');
    expect(allQueries).toContain(
      'CREATE TABLE IF NOT EXISTS "public"."tenant_coupons"',
    );
    expect(allQueries).toContain(
      'CREATE TABLE IF NOT EXISTS "public"."coupon_redemptions"',
    );
    expect(allQueries).toContain('tenant_schema_provisioned = true');
    expect(allQueries).toContain('to_regnamespace(schema_name) IS NOT NULL');
    expect(allQueries).not.toContain('t_f7afacc7cee74afaac82e051221b5f68');
  });

  it('fails loudly for a provisioned tenant schema with missing order prerequisites', async () => {
    const migration = new TenantCoupons1712600183000();
    const { queryRunner } = createQueryRunner((sql) => {
      if (sql.includes("to_regclass('public.tenants')")) {
        return [{ regclass: 'tenants' }];
      }
      if (sql.includes('FROM public.tenants')) {
        return [{ schema_name: 't_33333333333333333333333333333333' }];
      }
      if (
        sql.includes(
          'ALTER TABLE "t_33333333333333333333333333333333"."orders"',
        )
      ) {
        throw new Error('relation "orders" does not exist');
      }
      return [];
    });

    await expect(migration.up(queryRunner)).rejects.toThrow(
      'relation "orders" does not exist',
    );
  });

  it('handles multiple provisioned tenant schemas without cross-tenant names', async () => {
    const migration = new OrderRequests1712600181000();
    const { queryRunner, queries } = createQueryRunner((sql) => {
      if (sql.includes('FROM public.tenants')) {
        return [
          { schema_name: 't_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
          { schema_name: 't_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        ];
      }
      return [];
    });

    await migration.up(queryRunner);

    const allQueries = queries.join('\n');
    expect(allQueries).toContain(
      '"t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"."order_requests"',
    );
    expect(allQueries).toContain(
      '"t_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"."order_requests"',
    );
    expect(allQueries).not.toContain('t_f7afacc7cee74afaac82e051221b5f68');
  });
});
