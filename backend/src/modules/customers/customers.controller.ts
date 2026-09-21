import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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
import { ReorderSuggestionsService } from '../reorder-suggestions/reorder-suggestions.service';
import { CustomersService } from './customers.service';
import { CustomerCreditAdjustDto } from './dto/customer-credit-adjust.dto';
import { CustomerCreditAmountDto } from './dto/customer-credit-amount.dto';
import { CustomerCreditLedgerQueryDto } from './dto/customer-credit-ledger-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  BulkCustomerWhatsappPermissionsDto,
  PatchCustomerWhatsappPermissionsDto,
} from './dto/customer-whatsapp-permissions.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Customers')
@ApiBearerAuth('bearer')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly reorderSuggestionsService: ReorderSuggestionsService,
  ) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(@CurrentUser() user: JwtUserPayload, @Query() query: CustomerQueryDto) {
    return this.customersService.list(user, query);
  }

  /** Compare cached `credit_balance` to SUM(ledger.amount) for customers with ledger rows (ops / nightly checks). */
  @Get('credit-ledger/reconciliation')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  creditLedgerReconciliation(@Query('limit') limit?: string) {
    const take = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 500);
    return this.customersService.listCreditLedgerMismatches(take);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user, dto);
  }

  @Post(':id/credit/add')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  addCreditLimit(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerCreditAmountDto,
  ) {
    return this.customersService.addCreditLimit(user, id, dto.amount);
  }

  @Post(':id/credit/pay')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  applyCreditPayment(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerCreditAmountDto,
  ) {
    return this.customersService.applyCreditPayment(user, id, dto.amount);
  }

  @Get(':id/credit-ledger')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.CUSTOMER,
  )
  creditLedger(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CustomerCreditLedgerQueryDto,
  ) {
    return this.customersService.listCreditLedger(user, id, query);
  }

  @Post(':id/credit-adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  creditAdjust(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerCreditAdjustDto,
  ) {
    return this.customersService.applyCreditAdjust(user, id, dto);
  }

  @Post(':id/credit-write-off')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  creditWriteOff(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerCreditAmountDto,
  ) {
    return this.customersService.applyWriteOff(user, id, dto.amount);
  }

  /**
   * Smart reorder: SKUs whose median buy interval suggests they are due again (UTC calendar days).
   * Retailers may only read their own row (`CUSTOMER` + matching `customerId`).
   */
  @Get(':id/reorder-suggestions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.CUSTOMER,
  )
  reorderSuggestionsForCustomer(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reorderSuggestionsService.getSuggestionsForCustomerResponse(user, id);
  }

  @Post('bulk/whatsapp-permissions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  bulkWhatsappPermissions(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: BulkCustomerWhatsappPermissionsDto,
  ) {
    return this.customersService.bulkUpdateWhatsappPermissions(user, dto);
  }

  @Get(':id/whatsapp-permissions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  getWhatsappPermissions(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getWhatsappPermissions(user, id);
  }

  @Patch(':id/whatsapp-permissions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  patchWhatsappPermissions(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchCustomerWhatsappPermissionsDto,
  ) {
    return this.customersService.updateWhatsappPermissions(user, id, dto);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  getById(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getById(user, id);
  }

  @Put(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  remove(@CurrentUser() user: JwtUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(user, id);
  }
}
