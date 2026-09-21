import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import type { WaWebhookPayload } from '../whatsapp-webhook.types';
import { WhatsappInboundService } from '../services/whatsapp-inbound.service';
import { WhatsappWebhookVerifyService } from '../services/whatsapp-webhook-verify.service';

@SkipThrottle()
@ApiExcludeController()
@Public()
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(
    private readonly inbound: WhatsappInboundService,
    private readonly verifySvc: WhatsappWebhookVerifyService,
  ) {}

  /**
   * Meta webhook verification (GET). Matches `WHATSAPP_VERIFY_TOKEN` in .env, or a
   * `platform_whatsapp_numbers.webhook_verify_token` when `use_own_token` is true for that line.
   */
  @Get()
  async verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): Promise<string> {
    return this.verifySvc.resolveVerifyChallenge(mode, token, challenge);
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: WaWebhookPayload,
  ): Promise<{ ok: true }> {
    await this.verifySvc.assertInboundSignatureValid(req);
    await this.inbound.handlePayload(body ?? ({} as WaWebhookPayload));
    return { ok: true };
  }
}

/**
 * Same behaviour as {@link WhatsappWebhookController}; alternate path for Meta / ngrok
 * configs that use `/whatsapp/webhook` instead of `/webhooks/whatsapp`.
 */
@SkipThrottle()
@ApiExcludeController()
@Public()
@Controller('whatsapp')
export class WhatsappWebhookAliasController {
  constructor(
    private readonly inbound: WhatsappInboundService,
    private readonly verifySvc: WhatsappWebhookVerifyService,
  ) {}

  @Get('webhook')
  async verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): Promise<string> {
    return this.verifySvc.resolveVerifyChallenge(mode, token, challenge);
  }

  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: WaWebhookPayload,
  ): Promise<{ ok: true }> {
    await this.verifySvc.assertInboundSignatureValid(req);
    await this.inbound.handlePayload(body ?? ({} as WaWebhookPayload));
    return { ok: true };
  }
}
