import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformStorageProvidersController } from './platform-storage-providers.controller';

describe('PlatformStorageProvidersController metadata', () => {
  it('registers the Super Admin storage provider route prefix', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, PlatformStorageProvidersController),
    ).toBe('admin/storage-providers');
  });

  it('requires JWT, roles guard, and SUPER_ADMIN role', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      PlatformStorageProvidersController,
    );

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata(ROLES_KEY, PlatformStorageProvidersController),
    ).toEqual([UserRole.SUPER_ADMIN]);
  });

  it('registers provider management action routes', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PlatformStorageProvidersController.prototype.testConnection,
      ),
    ).toBe(':id/test-connection');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PlatformStorageProvidersController.prototype.testConnection,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PlatformStorageProvidersController.prototype.setDefault,
      ),
    ).toBe(':id/set-default');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PlatformStorageProvidersController.prototype.disable,
      ),
    ).toBe(':id/disable');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PlatformStorageProvidersController.prototype.enable,
      ),
    ).toBe(':id/enable');
  });
});
