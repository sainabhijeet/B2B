import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateStorefrontInquiryDto } from './dto/create-storefront-inquiry.dto';
import { SupportService } from './support.service';

@Controller('storefront/support')
@ApiTags('Storefront Support')
export class StorefrontSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('inquiries')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  create(
    @Body() dto: CreateStorefrontInquiryDto,
    @Req() req: Request & { tenantId?: string | null },
  ) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context missing. Use storefront host, X-Storefront-Host, or X-Tenant-Id.',
      );
    }
    return this.supportService.createStorefrontInquiry(req.tenantId, dto);
  }
}
