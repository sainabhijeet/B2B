import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Coupons')
@ApiBearerAuth('bearer')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  list(@CurrentUser() user: JwtUserPayload) {
    return this.coupons.list(user);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateCouponDto) {
    return this.coupons.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  update(@CurrentUser() user: JwtUserPayload, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.coupons.remove(user, id);
  }
}
