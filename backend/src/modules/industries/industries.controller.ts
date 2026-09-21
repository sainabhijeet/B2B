import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IndustriesService, type IndustryResponse } from './industries.service';

@Controller('industries')
@ApiTags('Industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  @ApiOkResponse({ description: 'Active industries (public — distributor onboarding & signup).' })
  listPublic(): Promise<IndustryResponse[]> {
    return this.industriesService.listPublic();
  }
}
