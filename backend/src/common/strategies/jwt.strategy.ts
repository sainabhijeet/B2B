import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  JwtUserPayload,
  normalizeJwtAccessPayload,
} from '../types/authenticated-request.type';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { accessTokenFromCookie } from '../security/auth-cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        accessTokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: Record<string, unknown>): Promise<JwtUserPayload> {
    try {
      const normalized = normalizeJwtAccessPayload(payload);
      const current = await this.users.findOne({
        where: { id: normalized.sub, deletedAt: IsNull() },
      });
      if (
        !current ||
        current.role !== normalized.role ||
        (current.tenantId ?? null) !== (normalized.tenantId ?? null) ||
        (current.customerId ?? null) !== (normalized.customerId ?? null)
      ) {
        throw new UnauthorizedException('Access token is no longer valid.');
      }
      return normalized;
    } catch {
      throw new UnauthorizedException('Invalid access token.');
    }
  }
}
