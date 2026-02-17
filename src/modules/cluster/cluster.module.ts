import { forwardRef, Module } from '@nestjs/common';
import { ClusterService } from './cluster.service';
import { ClusterController } from './cluster.controller';
import { ClusterRepository } from './cluster.repository';
import { BinModule } from '../bin/bin.module';
import { UserModule } from '../user/user.module';
import { TruckModule } from '../truck/truck.module';
import { KMeansService } from './cluster.kmeans.service';
import { RouteModule } from '../route/route.module';
import { SettingsService } from '../settings/settings.service';

@Module({
  imports:[forwardRef(() => BinModule),UserModule,forwardRef(() => TruckModule),forwardRef(() => RouteModule)],
  providers: [ClusterService,ClusterRepository,KMeansService,SettingsService],
  controllers: [ClusterController],
  exports:[ClusterService]
})
export class ClusterModule {}
