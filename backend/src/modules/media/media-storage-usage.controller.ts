import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { MediaStorageUsageResponseDto } from './dto/media-storage-usage-response.dto';
import { MediaStorageUsageService } from './media-storage-usage.service';

@ApiTags('Admin Media')
@ApiBearerAuth('bearer')
@Controller('admin/media/storage-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class MediaStorageUsageController {
  constructor(private readonly usage: MediaStorageUsageService) {}

  @Get()
  @ApiOkResponse({ description: 'Registry-backed storage usage aggregates.' })
  getUsage(): Promise<MediaStorageUsageResponseDto> {
    return this.usage.getUsage();
  }
}
