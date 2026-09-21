import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateTopProductDto } from './dto/create-top-product.dto';
import { UpdateTopProductDto } from './dto/update-top-product.dto';
import { TopProductsService } from './top-products.service';

@Controller('catalog/top-products')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Catalog — top products')
@ApiBearerAuth('bearer')
export class CatalogTopProductsController {
  constructor(private readonly topProducts: TopProductsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'List distributor-curated top variants (ordered by position)' })
  list(@CurrentUser() user: JwtUserPayload) {
    return this.topProducts.list(user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a variant to the top list (unique per variant)' })
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateTopProductDto) {
    return this.topProducts.create(user, dto);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update position and/or is_active' })
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopProductDto,
  ) {
    return this.topProducts.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove a variant from the top list' })
  remove(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.topProducts.remove(user, id);
  }
}
