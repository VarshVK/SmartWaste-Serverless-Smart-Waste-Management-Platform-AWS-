import { forwardRef, Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { RouteRepository } from './route.repository';
import { UserModule } from 'src/modules/user/user.module';
import { TruckModule } from 'src/modules/truck/truck.module';
import { BinModule } from 'src/modules/bin/bin.module';
import { ClusterModule } from 'src/modules/cluster/cluster.module';
import { IotDeviceModule } from '../iot-device/iot-device.module';
import { RouteOptimizerService } from './route-optimizer.service';

@Module({
  imports:[
    UserModule,forwardRef(() => TruckModule),forwardRef(() => ClusterModule),BinModule,IotDeviceModule
  ],
  controllers: [RouteController],
  providers: [RouteService,RouteRepository,RouteOptimizerService],
  exports: [RouteService,RouteOptimizerService]  
})
export class RouteModule {}
