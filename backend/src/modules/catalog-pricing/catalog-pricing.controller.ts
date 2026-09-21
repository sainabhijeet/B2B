import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CatalogPricingService } from './catalog-pricing.service';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto';
import { UpsertCustomerPriceDto } from './dto/upsert-customer-price.dto';
import { UpsertGroupPriceDto } from './dto/upsert-group-price.dto';
import { UpsertQuantityPriceDto } from './dto/upsert-quantity-price.dto';

@ApiTags('Catalog pricing (B2B)')
@Controller('catalog/pricing')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiBearerAuth('bearer')
export class CatalogPricingController {
  constructor(private readonly catalogPricing: CatalogPricingService) {}

  @Get('products/:productId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  productSummary(
    @CurrentUser() user: JwtUserPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('tenantId') platformTenantId?: string,
  ) {
    return this.catalogPricing.getProductPricingSummary(user, productId, {
      platformTenantId: platformTenantId?.trim() || undefined,
    });
  }

  @Post('customer-prices')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsertCustomerPrice(@CurrentUser() user: JwtUserPayload, @Body() dto: UpsertCustomerPriceDto) {
    return this.catalogPricing.upsertCustomerPrice(user, dto);
  }

  @Delete('customer-prices/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteCustomerPrice(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalogPricing.deleteCustomerPrice(user, id);
  }

  @Post('group-prices')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsertGroupPrice(@CurrentUser() user: JwtUserPayload, @Body() dto: UpsertGroupPriceDto) {
    return this.catalogPricing.upsertGroupPrice(user, dto);
  }

  @Delete('group-prices/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteGroupPrice(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalogPricing.deleteGroupPrice(user, id);
  }

  @Post('quantity-prices')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsertQuantityPrice(@CurrentUser() user: JwtUserPayload, @Body() dto: UpsertQuantityPriceDto) {
    return this.catalogPricing.upsertQuantityPrice(user, dto);
  }

  @Delete('quantity-prices/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteQuantityPrice(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalogPricing.deleteQuantityPrice(user, id);
  }

  @Get('customer-groups')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  listGroups(@CurrentUser() user: JwtUserPayload) {
    return this.catalogPricing.listCustomerGroups(user);
  }

  @Post('customer-groups')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createGroup(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateCustomerGroupDto) {
    return this.catalogPricing.createCustomerGroup(user, dto);
  }

  @Patch('customer-groups/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateGroup(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.catalogPricing.updateCustomerGroup(user, id, dto);
  }

  @Delete('customer-groups/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteGroup(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalogPricing.deleteCustomerGroup(user, id);
  }

  @Post('customer-groups/:id/members')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addMember(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    return this.catalogPricing.addGroupMember(user, groupId, dto);
  }

  @Delete('customer-groups/:groupId/members/:customerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  removeMember(
    @CurrentUser() user: JwtUserPayload,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.catalogPricing.removeGroupMember(user, groupId, customerId);
  }
}
