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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMasterBrandDto } from './dto/create-master-brand.dto';
import { ListMasterBrandsQueryDto } from './dto/list-master-brands-query.dto';
import { UpdateMasterBrandDto } from './dto/update-master-brand.dto';
import { MasterBrandsService } from './master-brands.service';

/**
 * Platform catalog (`public.master_brands`). No tenant context — use distributor `GET /brands` for merged lists.
 */
@Controller('master-brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Master brands')
@ApiBearerAuth('bearer')
export class MasterBrandsController {
  constructor(private readonly masterBrandsService: MasterBrandsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOperation({ summary: 'List platform master brands' })
  list(@Query() query: ListMasterBrandsQueryDto) {
    return this.masterBrandsService.list(query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOperation({ summary: 'Get one master brand' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterBrandsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create master brand (active distributors see it in merged brand options when status is active)' })
  create(@Body() dto: CreateMasterBrandDto) {
    return this.masterBrandsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update master brand (set status inactive to hide from distributor merged lists)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMasterBrandDto) {
    return this.masterBrandsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete master brand',
    description:
      'Deletes the platform row. Per DB FK, tenant shadow rows in `brands` get `master_brand_id` set to NULL (they are not deleted). Prefer deactivating via PATCH `status: inactive` unless you intend to remove the catalog entry.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterBrandsService.remove(id);
  }
}
