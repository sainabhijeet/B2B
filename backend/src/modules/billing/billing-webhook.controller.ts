import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { BillingService } from './billing.service';

@SkipThrottle()
@ApiExcludeController()
@Controller('billing/razorpay')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async razorpayWebhook(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('Raw body required for webhook verification.');
    }
    const sig = req.headers['x-razorpay-signature'];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    const result = await this.billingService.handleRazorpayWebhook(raw, sigStr);
    if (result?.unauthorized) throw new UnauthorizedException('Invalid webhook signature.');
    return result?.body ?? { ok: true };
  }
}
