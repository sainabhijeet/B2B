import { StorefrontProductsService } from './storefront-products.service';

function serviceForCatalogState(result: boolean | Error) {
  const queryBuilder = {
    withDeleted: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getExists:
      result instanceof Error
        ? jest.fn().mockRejectedValue(result)
        : jest.fn().mockResolvedValue(result),
  };
  const manager = {
    getRepository: jest.fn().mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    }),
  };
  const tenantRunner = {
    withTenantCatalog: jest.fn(
      async (_tenantId: string, work: (value: typeof manager) => unknown) =>
        work(manager),
    ),
  };
  const service = new StorefrontProductsService(
    tenantRunner as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, queryBuilder };
}

describe('StorefrontProductsService catalog presentation', () => {
  it('serves demo data only before the distributor has ever created a product', async () => {
    const { service } = serviceForCatalogState(false);

    await expect(service.catalogPresentation('tenant-1')).resolves.toEqual({
      mode: 'DEMO',
      hasDistributorProducts: false,
      notice: expect.stringContaining('sample data for testing only'),
    });
  });

  it('stays live after any product record exists, including soft-deleted rows', async () => {
    const { service, queryBuilder } = serviceForCatalogState(true);

    await expect(service.catalogPresentation('tenant-1')).resolves.toEqual({
      mode: 'LIVE',
      hasDistributorProducts: true,
      notice: null,
    });
    expect(queryBuilder.withDeleted).toHaveBeenCalledTimes(1);
  });

  it('fails closed instead of exposing demo data when catalog state is unknown', async () => {
    const { service } = serviceForCatalogState(new Error('schema unavailable'));

    await expect(service.catalogPresentation('tenant-1')).resolves.toEqual({
      mode: 'LIVE',
      hasDistributorProducts: false,
      notice: null,
    });
  });
});
