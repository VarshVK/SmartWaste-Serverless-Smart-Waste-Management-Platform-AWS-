import { forwardRef, Module } from '@nestjs/common';
import { TruckService } from './truck.service';
import { TruckController } from './truck.controller';
import { TruckRepository } from './truck.repository';
import { LocationService } from '../location/location.service';
import { ClusterModule } from '../cluster/cluster.module';

@Module({
  imports:[forwardRef(() => ClusterModule)],
  providers: [TruckService,TruckRepository,LocationService],
  controllers: [TruckController],
  exports:[TruckService]
})
export class TruckModule {}
