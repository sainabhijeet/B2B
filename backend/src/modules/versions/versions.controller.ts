import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateVersionDto } from './dto/create-version.dto';
import { ListVersionsQueryDto } from './dto/list-versions-query.dto';
import { ReleaseVersionDto } from './dto/release-version.dto';
import { VersionsService } from './versions.service';

@Controller('versions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Versions')
@ApiBearerAuth('bearer')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateVersionDto) {
    return this.versionsService.create(user, dto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(@CurrentUser() user: JwtUserPayload, @Query() query: ListVersionsQueryDto) {
    return this.versionsService.list(user, query);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  getById(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.versionsService.getById(user, id);
  }

  @Post(':id/release')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  release(@CurrentUser() user: JwtUserPayload, @Param('id') id: string, @Body() dto: ReleaseVersionDto) {
    return this.versionsService.release(user, id, dto);
  }
}
