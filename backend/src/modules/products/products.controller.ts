import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlanLimit } from '../../common/decorators/plan-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanLimitGuard } from '../../common/guards/plan-limit.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpsertInventoryDto } from './dto/upsert-inventory.dto';
import { ProductsService } from './products.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Products')
@ApiBearerAuth('bearer')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(@CurrentUser() user: JwtUserPayload, @Query() query: ProductQueryDto) {
    return this.productsService.list(user, query);
  }

  @Get('products/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  findOne(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.productsService.findOne(user, id);
  }

  @Post('products')
  @UseGuards(PlanLimitGuard)
  @PlanLimit('max_products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(user, dto);
  }

  @Patch('products/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user, id, dto);
  }

  @Delete('products/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  remove(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.productsService.remove(user, id);
  }

  @Post('products/:id/variants')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  createVariant(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productsService.createVariant(user, id, dto);
  }

  @Patch('products/:productId/variants/:variantId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  updateVariant(
    @CurrentUser() user: JwtUserPayload,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(user, productId, variantId, dto);
  }

  @Post('products/:id/images')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  addImage(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productsService.addImage(user, id, dto);
  }

  @Post('inventory')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  upsertInventory(@CurrentUser() user: JwtUserPayload, @Body() dto: UpsertInventoryDto) {
    return this.productsService.upsertInventory(user, dto);
  }
}
