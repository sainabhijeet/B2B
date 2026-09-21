import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Invoices')
@ApiBearerAuth('bearer')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  generate(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: GenerateInvoiceDto,
  ) {
    return this.invoicesService.generate(user, dto);
  }

  @Get()
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  list(@CurrentUser() user: JwtUserPayload) {
    return this.invoicesService.list(user);
  }

  @Get(':id/download')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  download(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.invoicesService.download(user, id);
  }
}
