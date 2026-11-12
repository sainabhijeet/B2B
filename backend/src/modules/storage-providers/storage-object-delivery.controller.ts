import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { StorageObjectDeliveryService } from './storage-object-delivery.service';

type OptionalAuthRequest = Request & { user?: JwtUserPayload };

@Controller('storage-objects')
@ApiTags('Storage Objects')
export class StorageObjectDeliveryController {
  constructor(private readonly delivery: StorageObjectDeliveryService) {}

  @Post(':id/signed-read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async createSignedReadAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const access = await this.delivery.createSignedReadAccess(id, user);
    return {
      success: true,
      data: access,
      meta: {},
      message: '',
    };
  }

  @Get(':id/content')
  @UseGuards(OptionalJwtAuthGuard)
  async readContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Req() request: OptionalAuthRequest,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.delivery.openReadStream({
      objectId: id,
      actor: request.user,
      token: typeof token === 'string' ? token : undefined,
    });
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', result.contentDisposition);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Vary', 'Authorization');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Accept-Ranges', 'none');
    if (result.contentLength !== null) {
      response.setHeader('Content-Length', String(result.contentLength));
    }
    result.stream.on('error', () => {
      if (!response.headersSent) {
        response.status(404).end();
        return;
      }
      response.destroy();
    });
    result.stream.pipe(response);
  }
}
