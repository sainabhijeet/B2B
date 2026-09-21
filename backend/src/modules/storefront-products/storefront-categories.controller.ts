import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { StorefrontCategoriesService } from './storefront-categories.service';
import { absolutizeStorefrontMediaUrls } from './storefront-media-url';

@ApiTags('Storefront categories')
@Controller('storefront/categories')
export class StorefrontCategoriesController {
  constructor(private readonly storefrontCategories: StorefrontCategoriesService) {}

  @Get()
  async list(
    @Req() req: Request & { tenantId?: string | null },
    @Query('channel') channel?: string,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    const result = await this.storefrontCategories.list(
      req.tenantId,
      channel === 'app' || channel === 'website' ? channel : undefined,
    );
    return absolutizeStorefrontMediaUrls(result, req);
  }
}
