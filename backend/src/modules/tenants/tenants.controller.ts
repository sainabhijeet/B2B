import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Tenants')
@ApiBearerAuth('bearer')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  list() {
    return this.tenantsService.list();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBody({
    type: CreateTenantDto,
    examples: {
      newTenant: {
        summary: 'New tenant + owner',
        value: {
          slug: 'acme-store',
          name: 'Acme Store',
          ownerEmail: 'owner@acme.example.com',
          ownerPassword: '<strong-owner-password>',
          ownerPhone: '9876543210',
          referralCode: 'A1B2C3D4123',
        },
      },
    },
  })
  create(@Body() dto: CreateTenantDto, @Req() req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim() || null
        : Array.isArray(forwarded)
          ? forwarded[0]?.trim() || null
          : req.ip || null;
    return this.tenantsService.create(dto, { clientIp });
  }

  @Post(':id/provision-schema')
  @Roles(UserRole.SUPER_ADMIN)
  provisionSchema(@Param('id') id: string) {
    return this.tenantsService.provisionTenantSchema(id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  getById(@Param('id') id: string) {
    return this.tenantsService.getAdminDetail(id);
  }

  @Get(':id/usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  usage(@Param('id') id: string) {
    return this.tenantsService.getUsage(id);
  }
}
