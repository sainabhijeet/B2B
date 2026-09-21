import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AddGuestCartItemDto } from './dto/add-guest-cart-item.dto';
import { StorefrontGuestCartService } from './storefront-guest-cart.service';

@ApiTags('Storefront guest cart')
@Controller('storefront/guest-cart')
export class StorefrontGuestCartController {
  constructor(private readonly guestCart: StorefrontGuestCartService) {}

  private deviceId(req: Request): string {
    const raw = req.headers['x-device-id'];
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new BadRequestException('X-Device-Id header is required for guest cart.');
    }
    return raw.trim();
  }

  @Get()
  list(@Req() req: Request & { tenantId?: string | null }) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    return this.guestCart.list(req.tenantId, this.deviceId(req));
  }

  @Post('items')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  addItem(
    @Req() req: Request & { tenantId?: string | null },
    @Body() dto: AddGuestCartItemDto,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    return this.guestCart.addItem(req.tenantId, this.deviceId(req), dto);
  }

  @Delete('items/:id')
  removeItem(
    @Req() req: Request & { tenantId?: string | null },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException(
        'Store tenant context is required. Send X-Tenant-Id, or resolve tenant via X-Storefront-Host / Host.',
      );
    }
    return this.guestCart.removeItem(req.tenantId, this.deviceId(req), id);
  }
}
