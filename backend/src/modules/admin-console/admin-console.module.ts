import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModuleState } from '../../common/entities/admin-module-state.entity';
import { AdminMediaFile } from '../../common/entities/admin-media-file.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminConsoleController } from './admin-console.controller';
import { AdminConsoleService } from './admin-console.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminModuleState, AdminMediaFile]), AuditLogsModule],
  controllers: [AdminConsoleController],
  providers: [AdminConsoleService],
})
export class AdminConsoleModule {}
