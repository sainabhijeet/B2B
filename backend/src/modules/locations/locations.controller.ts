import { Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LocationsService, type CityResponse, type PincodeResponse, type StateResponse } from './locations.service';

@Controller('locations')
@ApiTags('Locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('states')
  @ApiOkResponse({ description: 'States/UTs for a country (active only)' })
  listStates(@Query('countryId', ParseUUIDPipe) countryId: string): Promise<StateResponse[]> {
    return this.locationsService.findStatesPublic(countryId);
  }

  @Get('cities')
  @ApiOkResponse({ description: 'Cities for a state (active only)' })
  listCities(@Query('stateId', ParseUUIDPipe) stateId: string): Promise<CityResponse[]> {
    return this.locationsService.findCitiesPublic(stateId);
  }

  @Get('pincodes')
  @ApiOkResponse({ description: 'Postal/ZIP codes for a city (active only)' })
  listPincodes(@Query('cityId', ParseUUIDPipe) cityId: string): Promise<PincodeResponse[]> {
    return this.locationsService.findPincodesPublic(cityId);
  }
}
