import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { PaymentActionDto } from './dto/payment-action.dto';
import { UploadPaymentProofDto } from './dto/upload-payment-proof.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyOrderRazorpayPaymentDto } from './dto/verify-order-razorpay-payment.dto';
import {
  CreateOrderRequestDto,
  ReviewOrderRequestDto,
} from './dto/order-request.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Orders')
@ApiBearerAuth('bearer')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user, dto);
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
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.listOrders(user, query);
  }

  @Get(':id')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  getById(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.ordersService.getOrder(user, id);
  }

  @Get(':id/timeline')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  timeline(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.ordersService.timeline(user, id);
  }

  @Post(':id/requests')
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('photos', 5, {
      storage: memoryStorage(),
      limits: { files: 5, fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  createRequest(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateOrderRequestDto,
    @UploadedFiles() photos: Express.Multer.File[] = [],
  ) {
    return this.ordersService.createRequest(user, id, dto, photos);
  }

  @Get(':id/requests')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  listRequests(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.ordersService.listRequests(user, id);
  }

  @Put(':id/requests/:requestId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  reviewRequest(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewOrderRequestDto,
  ) {
    return this.ordersService.reviewRequest(user, id, requestId, dto);
  }

  @Put(':id/status')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  updateStatus(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, id, dto);
  }

  @Post(':id/payment-proof')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  uploadPaymentProof(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UploadPaymentProofDto,
  ) {
    return this.ordersService.uploadPaymentProof(user, id, dto);
  }

  @Post(':id/payment-proof/upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(
    UserRole.CUSTOMER,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPaymentProofFile(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UploadPaymentProofDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ordersService.uploadPaymentProof(user, id, dto, file);
  }

  @Post(':id/payment/abandon')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  abandonPendingPayment(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    return this.ordersService.abandonPendingPaymentOrder(user, id);
  }

  @Post(':id/razorpay/order')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  createRazorpayOrder(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    return this.ordersService.createRazorpayOrder(user, id);
  }

  @Post(':id/razorpay/abandon')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  abandonRazorpayOrder(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    return this.ordersService.abandonRazorpayOrder(user, id);
  }

  @Post(':id/razorpay/verify')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  verifyRazorpayPayment(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: VerifyOrderRazorpayPaymentDto,
  ) {
    return this.ordersService.verifyRazorpayPayment(user, id, dto);
  }

  @Put(':id/payment')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  paymentAction(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: PaymentActionDto,
  ) {
    return this.ordersService.paymentAction(user, id, dto);
  }

  @Put(':id/dispatch')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  dispatch(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.ordersService.dispatch(user, id);
  }

  @Put(':id/deliver')
  @Roles(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
  )
  deliver(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.ordersService.deliver(user, id);
  }
}
