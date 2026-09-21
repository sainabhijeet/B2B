import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { ListTranslationsQueryDto } from './dto/list-translations-query.dto';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';
import { TranslationsService } from './translations.service';

@Controller('translations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Translations')
@ApiBearerAuth('bearer')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
    UserRole.CUSTOMER,
  )
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListTranslationsQueryDto,
  ) {
    return this.translationsService.list(user, query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  upsert(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertTranslationDto,
  ) {
    return this.translationsService.upsert(user, dto);
  }
}
