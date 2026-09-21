import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
@ApiTags('Cart')
@ApiBearerAuth('bearer')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: JwtUserPayload) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  addItem(@CurrentUser() user: JwtUserPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user, dto);
  }

  @Put('items/:id')
  updateItem(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.cartService.removeItem(user, id);
  }
}
