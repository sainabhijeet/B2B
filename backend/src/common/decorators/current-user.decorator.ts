import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserPayload } from '../types/authenticated-request.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload =>
    ctx.switchToHttp().getRequest().user as JwtUserPayload,
);
