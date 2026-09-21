import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ListAdminCitiesQueryDto } from './dto/list-admin-cities.query.dto';
import { ListAdminPincodesQueryDto } from './dto/list-admin-pincodes.query.dto';
import { ListAdminStatesQueryDto } from './dto/list-admin-states.query.dto';
import { LocationsService } from './locations.service';

@SkipThrottle()
@Controller('admin/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Locations Admin')
@ApiBearerAuth('bearer')
export class AdminLocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('states')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({ description: 'States for one country — paginated (select country in UI first).' })
  listStatesAdmin(@Query() query: ListAdminStatesQueryDto) {
    return this.locationsService.findStatesAdminPage(query);
  }

  @Get('cities')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({ description: 'Cities for one state — paginated (select state in UI first).' })
  listCitiesAdmin(@Query() query: ListAdminCitiesQueryDto) {
    return this.locationsService.findCitiesAdminPage(query);
  }

  @Get('pincodes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({ description: 'Pincodes for one city — paginated (select city in UI first).' })
  listPincodesAdmin(@Query() query: ListAdminPincodesQueryDto) {
    return this.locationsService.findPincodesAdminPage(query);
  }
}
