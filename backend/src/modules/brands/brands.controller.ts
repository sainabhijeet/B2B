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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { BrandsService } from './brands.service';
import { CreateTenantBrandDto } from './dto/create-tenant-brand.dto';
import { UpdateTenantBrandDto } from './dto/update-tenant-brand.dto';

@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Brands')
@ApiBearerAuth('bearer')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get('options')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  options(@CurrentUser() user: JwtUserPayload) {
    return this.brandsService.listMerged(user, false);
  }

  /** Same merged list as `GET /brands/options`; supports `?includeInactive=1` for your custom rows. */
  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const all =
      includeInactive === '1' || includeInactive?.toLowerCase() === 'true';
    return this.brandsService.listMerged(user, all);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateTenantBrandDto) {
    return this.brandsService.createCustomBrand(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantBrandDto,
  ) {
    return this.brandsService.updateCustomBrand(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  remove(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.deleteCustomBrand(user, id);
  }
}
