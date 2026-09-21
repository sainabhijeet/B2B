import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantBranding } from '../../common/entities/tenant-branding.entity';
import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantBranding])],
  controllers: [LogoController],
  providers: [LogoService],
})
export class LogoModule {}
