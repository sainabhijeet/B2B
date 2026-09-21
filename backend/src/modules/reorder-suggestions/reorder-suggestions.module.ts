import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../common/entities/customer.entity';
import { User } from '../../common/entities/user.entity';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { ReorderSuggestionsService } from './reorder-suggestions.service';

@Module({
  imports: [TenancyModule, TypeOrmModule.forFeature([User, Customer])],
  providers: [ReorderSuggestionsService],
  exports: [ReorderSuggestionsService],
})
export class ReorderSuggestionsModule {}
