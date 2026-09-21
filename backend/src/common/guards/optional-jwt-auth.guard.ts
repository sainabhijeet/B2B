import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';

/**
 * Runs JWT validation when `Authorization: Bearer` is present; otherwise continues as anonymous.
 * Used for storefront routes that personalize prices when a B2B retailer token is sent.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      req.user = undefined;
      return true;
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      req.user = undefined;
      return true;
    }
  }

  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) return undefined as TUser;
    return user;
  }
}
