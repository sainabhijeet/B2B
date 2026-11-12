import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import {
  CreateMediaFolderDto,
  UpdateMediaFolderDto,
} from './dto/media-folder.dto';
import { MediaFolderResponseDto } from './dto/media-folder-response.dto';
import { MediaFoldersService } from './media-folders.service';

@ApiTags('Admin Media Folders')
@ApiBearerAuth('bearer')
@Controller('admin/media/folders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class MediaFoldersController {
  constructor(private readonly foldersService: MediaFoldersService) {}

  @Get()
  @ApiOkResponse({ type: [MediaFolderResponseDto] })
  list(
    @Req() request: AuthenticatedRequest,
  ): Promise<MediaFolderResponseDto[]> {
    return this.foldersService.list(request.user);
  }

  @Post()
  @ApiCreatedResponse({ type: MediaFolderResponseDto })
  create(
    @Body() body: CreateMediaFolderDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MediaFolderResponseDto> {
    return this.foldersService.create(body, request.user);
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MediaFolderResponseDto })
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<MediaFolderResponseDto> {
    return this.foldersService.get(id, request.user);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MediaFolderResponseDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMediaFolderDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MediaFolderResponseDto> {
    return this.foldersService.update(id, body, request.user);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    return this.foldersService.delete(id, request.user);
  }
}
