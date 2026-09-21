import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUserPayload } from '../common/types/authenticated-request.type';
import { CreateBuildDto } from './dto/create-build.dto';
import { ListBuildsQueryDto } from './dto/list-builds-query.dto';
import { BuildService } from './build.service';

@Controller('builds')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Build System')
@ApiBearerAuth('bearer')
export class BuildController {
  constructor(private readonly buildService: BuildService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateBuildDto) {
    return this.buildService.createBuild(user, dto);
  }

  @Post(':id/retry')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  retry(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.buildService.retryBuild(user, id);
  }

  @Get('artifacts/:artifactId/download')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  async downloadArtifact(
    @CurrentUser() user: JwtUserPayload,
    @Param('artifactId') artifactId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const artifact = await this.buildService.getArtifact(user, artifactId);
    const asciiName = artifact.fileName
      .replace(/[^\x20-\x7e]/gu, '_')
      .replace(/["\\]/gu, '_');
    response.set({
      'Content-Type': artifact.contentType,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(artifact.fileName)}`,
      'Content-Length': String(artifact.fileSize),
    });
    return new StreamableFile(createReadStream(artifact.absolutePath));
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  getById(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.buildService.getBuildById(user, id);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_SUPPORT,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  list(@CurrentUser() user: JwtUserPayload, @Query() query: ListBuildsQueryDto) {
    return this.buildService.listBuilds(user, query);
  }
}
