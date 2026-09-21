import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { GenerateLogoDto } from './dto/generate-logo.dto';
import { LogoService } from './logo.service';

@Controller('logo')
@ApiTags('Logo (AI)')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class LogoController {
  constructor(private readonly logo: LogoService) {}

  private tenantId(req: AuthenticatedRequest): string {
    const id = req.user.tenantId;
    if (!id) throw new UnauthorizedException('Tenant context required.');
    return id;
  }

  @Post('generate')
  generate(@Req() req: AuthenticatedRequest, @Body() dto: GenerateLogoDto) {
    return this.logo.generate(this.tenantId(req), dto);
  }
}
