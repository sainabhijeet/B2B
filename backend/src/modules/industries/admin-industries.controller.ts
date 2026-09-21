import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateIndustryDto } from './dto/create-industry.dto';
import { UpdateIndustryDto } from './dto/update-industry.dto';
import { IndustriesService, type IndustryResponse } from './industries.service';

@Controller('admin/industries')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Industries Admin')
@ApiBearerAuth('bearer')
export class AdminIndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiOkResponse({ description: 'All industries (admin).' })
  list(): Promise<IndustryResponse[]> {
    return this.industriesService.listAdmin();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateIndustryDto): Promise<IndustryResponse> {
    return this.industriesService.create(dto);
  }

  @Patch(':industryId')
  @Roles(UserRole.SUPER_ADMIN)
  update(
    @Param('industryId', ParseUUIDPipe) industryId: string,
    @Body() dto: UpdateIndustryDto,
  ): Promise<IndustryResponse> {
    return this.industriesService.update(industryId, dto);
  }

  @Delete(':industryId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'Delete industry row.' })
  async remove(@Param('industryId', ParseUUIDPipe) industryId: string): Promise<{ ok: true }> {
    await this.industriesService.remove(industryId);
    return { ok: true };
  }
}
