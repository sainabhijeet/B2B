import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MediaStorageUsageController } from './media-storage-usage.controller';
import { MediaStorageUsageService } from './media-storage-usage.service';

describe('MediaStorageUsageController', () => {
  it('requires JWT and SUPER_ADMIN authorization', () => {
    const guards =
      Reflect.getMetadata('__guards__', MediaStorageUsageController) ?? [];
    const roles = Reflect.getMetadata(ROLES_KEY, MediaStorageUsageController);

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(roles).toEqual([UserRole.SUPER_ADMIN]);
  });

  it('delegates to the aggregate usage service', async () => {
    const response = {
      summary: { activeBytes: '0', activeObjects: 0 },
    };
    const usage = {
      getUsage: jest.fn().mockResolvedValue(response),
    };
    const controller = new MediaStorageUsageController(
      usage as unknown as MediaStorageUsageService,
    );

    await expect(controller.getUsage()).resolves.toBe(response);
    expect(usage.getUsage).toHaveBeenCalledTimes(1);
  });
});
