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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AttributesService } from './attributes.service';
import { AttributeQueryDto } from './dto/attribute-query.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@Controller('attributes')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Attributes')
@ApiBearerAuth('bearer')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(@CurrentUser() user: JwtUserPayload, @Query() query: AttributeQueryDto) {
    return this.attributesService.list(user, query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateAttributeDto) {
    return this.attributesService.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  remove(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.attributesService.remove(user, id);
  }

  @Post(':id/values')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  createValue(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateAttributeValueDto,
  ) {
    return this.attributesService.createValue(user, id, dto);
  }

  @Get(':id/values')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  listValues(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.attributesService.listValues(user, id);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  findOne(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Query() query: AttributeQueryDto,
  ) {
    return this.attributesService.findOne(user, id, query);
  }
}
