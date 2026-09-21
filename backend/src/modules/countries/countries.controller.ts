import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CountriesService, type CountryResponse } from './countries.service';

@Controller('countries')
@ApiTags('Countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOkResponse({ description: 'Active countries (public — for registration & OTP UI)' })
  listPublic(): Promise<CountryResponse[]> {
    return this.countriesService.listPublic();
  }
}
