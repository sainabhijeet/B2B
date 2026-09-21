import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AdminConsoleService } from './admin-console.service';
import { SaveAdminModuleStateDto } from './dto/save-admin-module-state.dto';
import { UploadAdminMediaDto } from './dto/upload-admin-media.dto';
import { RunAdminJobDto } from './dto/run-admin-job.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Admin console')
@ApiBearerAuth('bearer')
export class AdminConsoleController {
  constructor(private readonly service: AdminConsoleService) {}

  @Get('analytics/overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  overview() {
    return this.service.analyticsOverview();
  }

  @Get('analytics/tenants')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  tenantAnalytics() {
    return this.service.tenantAnalytics();
  }

  @Get('analytics/revenue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  revenueAnalytics() {
    return this.service.revenueAnalytics();
  }

  @Get('analytics/builds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  buildAnalytics() {
    return this.service.buildAnalytics();
  }

  @Get('analytics/usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  usageAnalytics() {
    return this.service.usageAnalytics();
  }

  @Get('monitoring/health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  systemHealth() {
    return this.service.systemHealth();
  }

  @Get('logs/activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  activityLogs(@Query('limit') limit?: string) {
    return this.service.activityLogs(limit);
  }

  @Get('logs/api')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  apiLogs(@Query('limit') limit?: string) {
    return this.service.apiLogs(limit);
  }

  @Get('logs/errors')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  errorLogs(@Query('limit') limit?: string) {
    return this.service.errorLogs(limit);
  }

  @Get('logs/logins')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  loginLogs(@Query('limit') limit?: string) {
    return this.service.loginLogs(limit);
  }

  @Get('logs/builds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  buildLogs(@Query('limit') limit?: string) {
    return this.service.buildLogs(limit);
  }

  @Get('notifications/logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  notificationLogs(@Query('limit') limit?: string) {
    return this.service.notificationLogs(limit);
  }

  @Get('media')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  mediaFiles() {
    return this.service.mediaFiles();
  }

  @Post('media')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UploadAdminMediaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadMedia(user, dto, file);
  }

  @Delete('media/:id')
  @Roles(UserRole.SUPER_ADMIN)
  deleteMedia(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.deleteMedia(user, id);
  }

  @Post('scheduler/run')
  @Roles(UserRole.SUPER_ADMIN)
  runAdminJob(@CurrentUser() user: JwtUserPayload, @Body() dto: RunAdminJobDto) {
    return this.service.runAdminJob(user, dto.jobKey);
  }

  @Get('module-state/:moduleKey')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  moduleState(@Param('moduleKey') moduleKey: string) {
    return this.service.getModuleState(moduleKey);
  }

  @Put('module-state/:moduleKey')
  @Roles(UserRole.SUPER_ADMIN)
  saveModuleState(
    @CurrentUser() user: JwtUserPayload,
    @Param('moduleKey') moduleKey: string,
    @Body() dto: SaveAdminModuleStateDto,
  ) {
    return this.service.saveModuleState(moduleKey, dto, user);
  }
}
