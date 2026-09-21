import { Notification } from '../../common/entities/notification.entity';
import { StockAlertSubscription } from '../../common/entities/stock-alert-subscription.entity';
import { StockAlertsService } from './stock-alerts.service';

describe('StockAlertsService', () => {
  it('creates inbox notifications and completes active alerts after restock', async () => {
    const alert = {
      id: 'alert-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      productId: 'product-1',
      variantId: 'variant-1',
      status: 'ACTIVE',
      notifiedAt: null,
    } as unknown as StockAlertSubscription;
    const query: Record<string, jest.Mock> = {};
    query.setLock = jest.fn(() => query);
    query.where = jest.fn(() => query);
    query.andWhere = jest.fn(() => query);
    query.getMany = jest.fn().mockResolvedValue([alert]);

    const alertRepo = {
      createQueryBuilder: jest.fn(() => query),
      save: jest.fn().mockResolvedValue([alert]),
    };
    const notificationRepo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === StockAlertSubscription ? alertRepo : notificationRepo,
      ),
    };
    const dataSource = {
      transaction: jest.fn(async (work) => work(manager)),
    };
    const service = new StockAlertsService(
      dataSource as never,
      {} as never,
      {} as never,
    );

    const count = await service.notifyRestocked({
      tenantId: 'tenant-1',
      productId: 'product-1',
      variantId: 'variant-1',
      productName: 'Wholesale Oil',
      variantName: '5L-CASE',
      productSlug: 'wholesale-oil',
      availableStock: 20,
      minimumOrderQuantity: 10,
    });

    expect(count).toBe(1);
    expect(notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'user-1',
        type: 'BACK_IN_STOCK',
        status: 'SENT',
        entityType: 'PRODUCT',
        entityId: 'product-1',
        actionUrl: '/products/wholesale-oil',
        metadataJson: expect.objectContaining({ channel: 'IN_APP' }),
      }),
    );
    expect(notificationRepo.save).toHaveBeenCalledTimes(1);
    expect(alert.status).toBe('NOTIFIED');
    expect(alert.notifiedAt).toBeInstanceOf(Date);
    expect(alertRepo.save).toHaveBeenCalledWith([alert]);
  });

  it('does nothing until stock satisfies the B2B MOQ', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new StockAlertsService(
      dataSource as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.notifyRestocked({
        tenantId: 'tenant-1',
        productId: 'product-1',
        variantId: 'variant-1',
        productName: 'Wholesale Oil',
        variantName: '5L-CASE',
        productSlug: 'wholesale-oil',
        availableStock: 5,
        minimumOrderQuantity: 10,
      }),
    ).resolves.toBe(0);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
