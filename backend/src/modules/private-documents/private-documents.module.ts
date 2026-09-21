import { Global, Module } from '@nestjs/common';
import { PrivateDocumentsController } from './private-documents.controller';
import { PrivateDocumentsService } from './private-documents.service';

@Global()
@Module({
  controllers: [PrivateDocumentsController],
  providers: [PrivateDocumentsService],
  exports: [PrivateDocumentsService],
})
export class PrivateDocumentsModule {}
