import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AppConfigService } from '../app-config/app-config.service';
import { StorefrontProductQueryDto } from './dto/storefront-product-query.dto';
import { absolutizeStorefrontMediaUrls } from './storefront-media-url';
import { StorefrontProductsService } from './storefront-products.service';

@ApiTags('Storefront products')
@Controller('storefront/products')
export class StorefrontProductsController {
  constructor(
    private readonly storefrontProducts: StorefrontProductsService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )
  async list(
    @Req() req: Request & { tenantId?: string | null; user?: JwtUserPayload },
    @Query() query: StorefrontProductQueryDto,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    const settings = await this.appConfig.getForTenant(req.tenantId);
    const isCustomerSession =
      req.user?.role === UserRole.CUSTOMER &&
      !!req.user?.customerId &&
      req.user?.tenantId === req.tenantId;
    const hideListPrices = !isCustomerSession && !settings.showPricesToGuest;
    const result = await this.storefrontProducts.list(req.tenantId, req.query as Record<string, unknown>, query, {
      hideListPrices,
      languageCode: settings.selectedLanguageCode,
    });
    return absolutizeStorefrontMediaUrls(result, req);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  async detail(
    @Req() req: Request & { tenantId?: string | null; user?: JwtUserPayload },
    @Param('slug') slug: string,
    @Query('qty') qtyRaw?: string,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    const user = req.user;
    let customerId: string | null | undefined;
    if (user?.customerId && user.tenantId && user.tenantId === req.tenantId) {
      customerId = user.customerId;
    }
    const qty = qtyRaw != null && qtyRaw !== '' ? Number.parseInt(qtyRaw, 10) : undefined;
    const quantity = qty != null && !Number.isNaN(qty) ? qty : undefined;
    const settings = await this.appConfig.getForTenant(req.tenantId);
    const isCustomerSession =
      user?.role === UserRole.CUSTOMER &&
      !!user?.customerId &&
      user?.tenantId === req.tenantId;
    const hideVariantPrices = !isCustomerSession && !settings.showPricesToGuest;
    const result = await this.storefrontProducts.findBySlug(req.tenantId, slug, {
      customerId,
      quantity,
      hideVariantPrices,
      languageCode: settings.selectedLanguageCode,
    });
    return absolutizeStorefrontMediaUrls(result, req);
  }
}
