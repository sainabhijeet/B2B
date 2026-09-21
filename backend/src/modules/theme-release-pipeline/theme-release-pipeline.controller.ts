import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ThemeReleasePipelineService } from './theme-release-pipeline.service';

@Controller('internal/theme-releases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
export class ThemeReleasePipelineController {
  constructor(private readonly pipeline: ThemeReleasePipelineService) {}

  @Get(':candidateId/validation-history')
  async history(@Param('candidateId') candidateId: string) {
    const candidate = await this.pipeline.getCandidate(candidateId);
    if (!candidate)
      throw new NotFoundException('Release candidate was not found.');
    return this.pipeline.getValidationHistory(candidateId);
  }

  @Get(':candidateId')
  async candidate(@Param('candidateId') candidateId: string) {
    const result = await this.pipeline.getCandidate(candidateId);
    if (!result)
      throw new NotFoundException('Release candidate was not found.');
    return result;
  }
}
