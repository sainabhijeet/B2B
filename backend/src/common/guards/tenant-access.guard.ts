import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PLATFORM_ROLES } from '../enums/user-role.enum';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Unauthorized');
    if (PLATFORM_ROLES.includes(user.role)) return true;

    const inputTenantId =
      (request.body?.tenantId as string | undefined) ||
      (request.params?.tenantId as string | undefined) ||
      (request.query?.tenantId as string | undefined);

    if (!user.tenantId) {
      throw new ForbiddenException('Tenant access denied.');
    }
    if (!inputTenantId) {
      return true;
    }
    if (inputTenantId !== user.tenantId) {
      throw new BadRequestException('tenantId mismatch with authenticated user.');
    }
    return true;
  }
}
