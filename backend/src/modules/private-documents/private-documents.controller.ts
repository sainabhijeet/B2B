import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsInt, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrivateDocumentsService } from './private-documents.service';

class SignedDocumentQueryDto {
  @IsString()
  @Length(1, 4096)
  key: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expires: number;

  @IsString()
  @Length(64, 64)
  signature: string;
}

@ApiExcludeController()
@Controller('documents')
export class PrivateDocumentsController {
  constructor(private readonly documents: PrivateDocumentsService) {}

  @Public()
  @Get('download')
  async download(@Query() query: SignedDocumentQueryDto, @Res({ passthrough: true }) response: Response) {
    const document = await this.documents.resolveSigned(query.key, query.expires, query.signature);
    response.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="${document.fileName.replace(/["\\\r\n]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(document.absolutePath));
  }
}
