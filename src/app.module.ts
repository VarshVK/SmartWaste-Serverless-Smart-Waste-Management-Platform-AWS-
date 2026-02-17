import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { TruckModule } from './modules/truck/truck.module';
import { BinModule } from './modules/bin/bin.module';
import { ClusterModule } from './modules/cluster/cluster.module';
import { RouteModule } from './modules/route/route.module';
import { IotDeviceModule } from './modules/iot-device/iot-device.module';
import { IncidentReportModule } from './modules/incident-report/incident-report.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UserModule,
    TruckModule,
    BinModule,
    ClusterModule,
    RouteModule,
    IotDeviceModule,
    IncidentReportModule,
    AdminModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
