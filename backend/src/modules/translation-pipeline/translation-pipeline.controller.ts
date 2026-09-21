import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { BulkTranslationDto } from './dto/bulk-translation.dto';
import { CreateTranslationJobDto } from './dto/create-translation-job.dto';
import { ImportLocaleDto } from './dto/import-locale.dto';
import { ListTranslationJobsDto } from './dto/list-translation-jobs.dto';
import { ReviewTranslationDto } from './dto/review-translation.dto';
import { TranslationPipelineService } from './translation-pipeline.service';

@Controller('translation-pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Translation Pipeline')
@ApiBearerAuth('bearer')
export class TranslationPipelineController {
  constructor(private readonly service: TranslationPipelineService) {}

  @Post('jobs')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
  )
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateTranslationJobDto,
  ) {
    return this.service.createJob(user, dto);
  }

  @Get('jobs')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListTranslationJobsDto,
  ) {
    return this.service.list(user, query);
  }

  @Get('jobs/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  detail(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.detail(user, id);
  }

  @Post('jobs/:id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  publish(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.publish(user, id);
  }

  @Post('jobs/:id/import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  importLocale(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: ImportLocaleDto,
  ) {
    return this.service.importLocale(user, id, dto);
  }

  @Get('jobs/:id/export')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  export(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.export(user, id);
  }

  @Post('entries/:id/review')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  review(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewTranslationDto,
  ) {
    return this.service.review(user, id, dto);
  }

  @Post('entries/bulk-review')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  bulkReview(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: BulkTranslationDto,
  ) {
    return this.service.bulkReview(user, dto);
  }

  @Get('entries/:id/history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  history(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.history(user, id);
  }

  @Get('metrics')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
  )
  metrics(@CurrentUser() user: JwtUserPayload) {
    return this.service.metrics(user);
  }
}
