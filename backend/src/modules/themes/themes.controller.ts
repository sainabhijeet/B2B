import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateThemeComboDto } from './dto/create-theme-combo.dto';
import { SelectThemeDto } from './dto/select-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UploadThemeDto } from './dto/upload-theme.dto';
import { UpsertTenantSectionsDto } from './dto/upsert-tenant-sections.dto';
import { UpsertTenantThemeTokensDto } from './dto/upsert-tenant-theme-tokens.dto';
import { ThemeManifestCacheService } from './theme-manifest-cache.service';
import { ThemesService } from './themes.service';
import { ThemeRuntimeShadowInterceptor } from '../theme-runtime-shadow/theme-runtime-shadow.interceptor';
import { LocalizationService } from '../../common/localization/localization.service';

const MEDIA_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024;

@Controller('themes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Themes')
@ApiBearerAuth('bearer')
export class ThemesController {
  constructor(
    private readonly themesService: ThemesService,
    private readonly themeManifestCache: ThemeManifestCacheService,
    private readonly localization: LocalizationService,
  ) {}

  /** Public: resolved tenant from Host / `X-Storefront-Host` / `X-Tenant-Id` (middleware). */
  @Public()
  @SkipThrottle()
  @Get('storefront/current')
  @UseInterceptors(ThemeRuntimeShadowInterceptor)
  storefrontCurrent(@Req() req: Request & { tenantId?: string | null }) {
    return this.themesService.storefrontCurrent(req.tenantId ?? null);
  }

  @Public()
  @SkipThrottle()
  @Get('storefront/preview')
  async storefrontPreview(
    @Req() req: Request & { tenantId?: string | null },
    @Query('language') language?: string,
  ) {
    const data = await this.themesService.storefrontCurrent(
      req.tenantId ?? null,
    );
    return {
      ...data,
      languageCode: this.localization.resolveLanguage(language ?? 'en'),
      preview: true,
    };
  }

  @Public()
  @SkipThrottle()
  @Get('preview')
  preview(
    @Req() req: Request & { tenantId?: string | null },
    @Query('language') language?: string,
  ) {
    return this.storefrontPreview(req, language);
  }

  @Get('tenant/current')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  tenantCurrent(@CurrentUser() user: JwtUserPayload) {
    return this.themesService.tenantCurrent(user);
  }

  @Get('tenant-content')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  tenantContent(
    @CurrentUser() user: JwtUserPayload,
    @Query('page') page: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.themesService.getTenantSections(user, page, tenantId);
  }

  @Post('tenant-content')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  upsertTenantContent(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertTenantSectionsDto,
  ) {
    return this.themesService.upsertTenantSections(user, dto);
  }

  @Get('tenant-theme-tokens')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  tenantThemeTokens(
    @CurrentUser() user: JwtUserPayload,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.themesService.getTenantThemeTokens(user, tenantId);
  }

  @Post('tenant-theme-tokens')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  upsertTenantThemeTokens(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertTenantThemeTokensDto,
  ) {
    return this.themesService.upsertTenantThemeTokens(user, dto);
  }

  @Post('tenant-media/upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MEDIA_UPLOAD_LIMIT_BYTES },
    }),
  )
  uploadTenantMedia(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.themesService.uploadTenantMedia(user, file);
  }

  @Post('preview-media/upload')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MEDIA_UPLOAD_LIMIT_BYTES },
    }),
  )
  uploadThemePreviewMedia(@UploadedFile() file: Express.Multer.File) {
    return this.themesService.uploadThemePreviewMedia(file);
  }

  @Get('tenant/theme-change-history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  tenantThemeChangeHistory(
    @CurrentUser() user: JwtUserPayload,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.themesService.listTenantThemeChangeHistory(user, tenantId);
  }

  /** Register before bare `@Get()` so `combo-packs` is never ambiguous. */
  @Get('combo-packs')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  listComboPacks(@CurrentUser() user: JwtUserPayload) {
    return this.themesService.listComboPacks(user);
  }

  @Post('combo-packs')
  @Roles(UserRole.SUPER_ADMIN)
  createComboPack(@Body() dto: CreateThemeComboDto) {
    return this.themesService.createComboPack(dto);
  }

  /** Normalized manifest DTO (allow-lists, template keys, preset files) — no full `theme.json`. */
  @Public()
  @SkipThrottle()
  @Get(':themeId/manifest')
  async themeManifest(@Param('themeId', ParseUUIDPipe) themeId: string) {
    const data = await this.themeManifestCache.getManifest(themeId);
    return { success: true, data, meta: {}, message: '' };
  }

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadTheme(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadThemeDto,
  ) {
    return this.themesService.uploadThemePackage(file, dto);
  }

  @Patch(':themeId')
  @Roles(UserRole.SUPER_ADMIN)
  updateTheme(
    @Param('themeId', ParseUUIDPipe) themeId: string,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.themesService.updateThemeMetadata(themeId, dto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query('allStatuses') allStatuses?: string,
  ) {
    const all = allStatuses === '1' || allStatuses === 'true';
    return this.themesService.list(user, all);
  }

  /** Super-admin (any tenant) or distributor staff (own tenant only). */
  @Post('select')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  select(@CurrentUser() user: JwtUserPayload, @Body() dto: SelectThemeDto) {
    return this.themesService.select(user, dto);
  }
}
