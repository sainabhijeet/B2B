import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoCity } from '../../common/entities/geo-city.entity';
import { GeoPincode } from '../../common/entities/geo-pincode.entity';
import { GeoState } from '../../common/entities/geo-state.entity';
import { AdminLocationsController } from './admin-locations.controller';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([GeoState, GeoCity, GeoPincode])],
  controllers: [LocationsController, AdminLocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
