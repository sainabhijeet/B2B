import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CountriesService, type CountryResponse } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { ListAdminCountriesQueryDto } from './dto/list-admin-countries.query.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Controller('admin/countries')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Countries Admin')
@ApiBearerAuth('bearer')
export class AdminCountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  list(@Query() query: ListAdminCountriesQueryDto) {
    return this.countriesService.listAdminPaginated(
      query.page ?? 1,
      query.limit ?? 25,
      query.search,
    );
  }

  @Get(':countryId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  getOne(@Param('countryId', ParseUUIDPipe) countryId: string): Promise<CountryResponse> {
    return this.countriesService.getAdmin(countryId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateCountryDto): Promise<CountryResponse> {
    return this.countriesService.create(dto);
  }

  @Patch(':countryId')
  @Roles(UserRole.SUPER_ADMIN)
  update(
    @Param('countryId', ParseUUIDPipe) countryId: string,
    @Body() dto: UpdateCountryDto,
  ): Promise<CountryResponse> {
    return this.countriesService.update(countryId, dto);
  }
}
