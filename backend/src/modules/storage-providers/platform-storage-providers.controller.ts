import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreatePlatformStorageProviderDto } from './dto/create-platform-storage-provider.dto';
import { UpdatePlatformStorageProviderDto } from './dto/update-platform-storage-provider.dto';
import { PlatformStorageProvidersService } from './platform-storage-providers.service';

@Controller('admin/storage-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiTags('Platform Storage Providers')
@ApiBearerAuth('bearer')
export class PlatformStorageProvidersController {
  constructor(private readonly providers: PlatformStorageProvidersService) {}

  @Get()
  list() {
    return this.providers.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.providers.get(id);
  }

  @Post()
  create(
    @Body() dto: CreatePlatformStorageProviderDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformStorageProviderDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.update(id, dto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.remove(id, user);
  }

  @Post(':id/test-connection')
  testConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.testConnection(id, user);
  }

  @Post(':id/set-default')
  setDefault(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.setDefault(id, user);
  }

  @Post(':id/disable')
  disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.disable(id, user);
  }

  @Post(':id/enable')
  enable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.providers.enable(id, user);
  }
}
