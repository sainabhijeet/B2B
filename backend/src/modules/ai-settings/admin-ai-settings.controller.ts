import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PatchAiSettingsDto } from './dto/patch-ai-settings.dto';
import { AiSettingsService } from './ai-settings.service';

@Controller('admin/ai-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('AI settings')
@ApiBearerAuth('bearer')
export class AdminAiSettingsController {
  constructor(private readonly aiSettings: AiSettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  get() {
    return this.aiSettings.getResolved();
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN)
  patch(@Body() dto: PatchAiSettingsDto) {
    return this.aiSettings.update(dto);
  }
}
