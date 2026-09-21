import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateStockAlertDto } from './dto/create-stock-alert.dto';
import { StockAlertsService } from './stock-alerts.service';

@Controller('stock-alerts')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Stock alerts')
@ApiBearerAuth('bearer')
export class StockAlertsController {
  constructor(private readonly stockAlerts: StockAlertsService) {}

  @Get()
  @Roles(UserRole.CUSTOMER)
  list(@CurrentUser() user: JwtUserPayload) {
    return this.stockAlerts.listActive(user);
  }

  @Post()
  @Roles(UserRole.CUSTOMER)
  subscribe(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateStockAlertDto,
  ) {
    return this.stockAlerts.subscribe(user, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CUSTOMER)
  cancel(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.stockAlerts.cancel(user, id);
  }
}
