import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RbacModule {}
