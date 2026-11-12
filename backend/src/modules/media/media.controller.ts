import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { UPLOAD_VALIDATION_POLICIES } from '../storage-providers/upload-validation.service';
import { BulkMediaLifecycleDto } from './dto/media-lifecycle.dto';
import { ListMediaDto } from './dto/list-media.dto';
import { MoveMediaFolderDto } from './dto/media-folder.dto';
import {
  MediaListResponseDto,
  MediaResponseDto,
} from './dto/media-response.dto';
import { MediaFoldersService } from './media-folders.service';
import { MediaLifecycleService } from './media-lifecycle.service';
import { MediaService } from './media.service';

@ApiTags('Admin Media')
@ApiBearerAuth('bearer')
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaFoldersService: MediaFoldersService,
    private readonly mediaLifecycleService: MediaLifecycleService,
  ) {}

  @Get()
  @ApiOkResponse({ type: MediaListResponseDto })
  list(@Query() query: ListMediaDto): Promise<MediaListResponseDto> {
    return this.mediaService.list(query);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: UPLOAD_VALIDATION_POLICIES.media_library.maxBytes,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: MediaResponseDto })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<MediaResponseDto> {
    return this.mediaService.upload(file, request.user);
  }

  @Post('bulk-delete')
  bulkDelete(
    @Body() body: BulkMediaLifecycleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.mediaLifecycleService.bulkDelete(body.ids, request.user);
  }

  @Post('bulk-restore')
  bulkRestore(
    @Body() body: BulkMediaLifecycleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.mediaLifecycleService.bulkRestore(body.ids, request.user);
  }

  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.mediaLifecycleService.delete(id, request.user);
  }

  @Post(':id/restore')
  restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.mediaLifecycleService.restore(id, request.user);
  }

  @Patch(':id/folder')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MediaResponseDto })
  async moveToFolder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: MoveMediaFolderDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MediaResponseDto> {
    const moved = await this.mediaFoldersService.moveMedia(
      id,
      body,
      request.user,
    );
    return this.mediaService.getById(moved.id);
  }
  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MediaResponseDto })
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MediaResponseDto> {
    return this.mediaService.getById(id);
  }
}
