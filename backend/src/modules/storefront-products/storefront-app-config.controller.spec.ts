import { StorefrontAppConfigController } from './storefront-app-config.controller';
import { THEME_LIVE_PREVIEW_NOTICE } from './storefront-products.service';

describe('StorefrontAppConfigController preview catalog', () => {
  const tenantId = 'tenant-1';
  const request = { tenantId, headers: {} } as never;
  const liveCatalog = {
    mode: 'LIVE' as const,
    hasDistributorProducts: true,
    notice: null,
  };

  function setup() {
    const appConfigService = {
      getForTenant: jest.fn().mockResolvedValue({ selectedLanguageCode: 'en' }),
    };
    const themesService = {
      storefrontMobileTheme: jest.fn().mockResolvedValue({
        success: true,
        data: { preview: { demoCatalog: { products: [{ id: 'demo-1' }] } } },
        meta: {},
        message: '',
      }),
    };
    const storefrontProducts = {
      catalogPresentation: jest.fn().mockResolvedValue(liveCatalog),
    };
    const controller = new StorefrontAppConfigController(
      appConfigService as never,
      themesService as never,
      {} as never,
      {} as never,
      storefrontProducts as never,
      {} as never,
      {} as never,
    );
    return {
      appConfigService,
      themesService,
      storefrontProducts,
      controller,
    };
  }

  it('forces demo data for the mobile Live Preview even after a real product exists', async () => {
    const { controller, themesService } = setup();

    const response = await controller.getStorefrontTheme(
      request,
      'en',
      '1',
    );

    expect(themesService.storefrontMobileTheme).toHaveBeenCalledWith(
      tenantId,
      'en',
      true,
    );
    expect(response.data.catalog_mode).toBe('DEMO');
    expect(response.data.catalog_notice).toBe(THEME_LIVE_PREVIEW_NOTICE);
    expect(response.data.preview).toEqual({
      demoCatalog: { products: [{ id: 'demo-1' }] },
    });
  });

  it('keeps the normal mobile storefront live when a real product exists', async () => {
    const { controller, themesService } = setup();

    const response = await controller.getStorefrontTheme(request, 'en');

    expect(themesService.storefrontMobileTheme).toHaveBeenCalledWith(
      tenantId,
      'en',
      false,
    );
    expect(response.data.catalog_mode).toBe('LIVE');
    expect(response.data.catalog_notice).toBeNull();
  });

  it('marks app config as demo only for an explicit Live Preview request', async () => {
    const { controller } = setup();

    const previewResponse = await controller.getAppConfig(request, 'true');
    const normalResponse = await controller.getAppConfig(request);

    expect(previewResponse.data.catalogPresentation).toEqual({
      ...liveCatalog,
      mode: 'DEMO',
      notice: THEME_LIVE_PREVIEW_NOTICE,
    });
    expect(normalResponse.data.catalogPresentation).toEqual(liveCatalog);
  });
});
