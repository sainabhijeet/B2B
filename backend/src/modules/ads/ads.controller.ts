import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AdsService } from './ads.service';
import { CreateAdCreativeDto } from './dto/create-ad-creative.dto';
import { CreateAdDto } from './dto/create-ad.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { TrackAdEventDto } from './dto/track-ad-event.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Ads')
@ApiBearerAuth('bearer')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.CUSTOMER,
  )
  getAds(@CurrentUser() user: JwtUserPayload) {
    return this.adsService.getAds(user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  createLegacy(@Body() dto: CreateAdDto) {
    return this.adsService.createLegacy(dto);
  }

  @Post('events')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  track(@CurrentUser() user: JwtUserPayload, @Body() dto: TrackAdEventDto) {
    return this.adsService.track(user, dto);
  }

  @Get('campaigns')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  listCampaigns() {
    return this.adsService.listCampaigns();
  }

  @Get('campaigns/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  getCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.adsService.getCampaign(id);
  }

  @Post('campaigns')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.adsService.createCampaign(dto);
  }

  @Patch('campaigns/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  updateCampaign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto) {
    return this.adsService.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  deleteCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.adsService.deleteCampaign(id);
  }

  @Post('campaigns/:campaignId/creatives')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  createCreative(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateAdCreativeDto,
  ) {
    return this.adsService.createCreative(campaignId, dto);
  }

  @Get('analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  analytics() {
    return this.adsService.getAnalyticsSummary();
  }
}
