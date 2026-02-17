import { Module } from '@nestjs/common';
import { IoTDeviceService } from './iot-device.service';
import { IotDeviceController } from './iot-device.controller';
import { BinModule } from '../bin/bin.module';
import { IoTDeviceRepository } from './iot-device.repository';

@Module({
  imports:[BinModule],
  providers: [IoTDeviceService,IoTDeviceRepository],
  controllers: [IotDeviceController],
  exports:[IoTDeviceService]
})
export class IotDeviceModule {}
