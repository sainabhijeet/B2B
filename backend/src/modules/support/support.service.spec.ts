import { Repository } from 'typeorm';
import { SupportTicket } from '../../common/entities/support-ticket.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { SupportService } from './support.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('SupportService', () => {
  it('scopes customer ticket history to the signed-in customer', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const repository = { find } as unknown as Repository<SupportTicket>;
    const notifications = {} as NotificationsService;
    const service = new SupportService(repository, notifications);
    const customer = {
      sub: 'customer-user-id',
      tenantId: 'tenant-id',
      role: UserRole.CUSTOMER,
    } as JwtUserPayload;

    await service.list(customer);

    expect(find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-id',
        createdBy: 'customer-user-id',
      },
      order: { createdAt: 'DESC' },
    });
  });
});
