import { Product } from '../../common/entities/product.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { SystemConfig } from '../../common/entities/system-config.entity';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import type { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import type { Repository } from 'typeorm';
import { MobileCommerceController } from './mobile-commerce.controller';

const tenantId = '11111111-1111-4111-8111-111111111111';
const firstId = '22222222-2222-4222-8222-222222222222';
const secondId = '33333333-3333-4333-8333-333333333333';
const user = {
  tenantId,
  sub: '44444444-4444-4444-8444-444444444444',
} as JwtUserPayload;

describe('MobileCommerceController wishlist', () => {
  it('keeps productIds for app clients and adds ordered product previews for web', async () => {
    const configRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          value: JSON.stringify({ productIds: [secondId, firstId] }),
        }),
    };
    const productRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: firstId,
          name: 'First',
          slug: 'first',
          sku: 'ONE',
          brand: 'Brand',
        },
        {
          id: secondId,
          name: 'Second',
          slug: 'second',
          sku: 'TWO',
          brand: null,
        },
      ]),
    };
    const imageRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { productId: secondId, imageUrl: '/storage/second.jpg' },
        ]),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Product
          ? productRepo
          : entity === ProductImage
            ? imageRepo
            : null,
      ),
    };
    const runner = {
      withTenantCatalog: jest.fn(
        async (_id: string, work: (m: typeof manager) => Promise<unknown>) =>
          work(manager),
      ),
    };
    const controller = new MobileCommerceController(
      configRepo as unknown as Repository<SystemConfig>,
      runner as unknown as TenantSchemaRunner,
    );

    const result = await controller.wishlist(user);

    expect(result.data.productIds).toEqual([secondId, firstId]);
    expect(result.data.items).toEqual([
      {
        id: secondId,
        name: 'Second',
        slug: 'second',
        sku: 'TWO',
        brand: null,
        thumbnailUrl: '/storage/second.jpg',
      },
      {
        id: firstId,
        name: 'First',
        slug: 'first',
        sku: 'ONE',
        brand: 'Brand',
        thumbnailUrl: null,
      },
    ]);
    expect(runner.withTenantCatalog).toHaveBeenCalledWith(
      tenantId,
      expect.any(Function),
    );
  });
});
