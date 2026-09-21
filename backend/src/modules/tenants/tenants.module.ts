import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../../common/entities/plan.entity';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { User } from '../../common/entities/user.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { DistributorOnboardingModule } from '../distributor-onboarding/distributor-onboarding.module';
import { UsersModule } from '../users/users.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Plan, SystemConfig, Subscription, User]),
    UsersModule,
    AuditLogsModule,
    ReferralsModule,
    DistributorOnboardingModule,
    TenancyModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
