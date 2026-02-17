import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IoTDeviceRepository } from './iot-device.repository';
import { IoTDevice, IoTDeviceStatus } from './iot-devive.entity';
import { BinService } from '../bin/bin.service';
import { SensorData } from './sensor-data.entity';

@Injectable()
export class IoTDeviceService {
  constructor(
    private readonly iotDeviceRepository: IoTDeviceRepository,
    private readonly binService: BinService
  ) {}

  async createDevice(deviceData: Partial<IoTDevice>): Promise<IoTDevice> {
    await this.validateDeviceData(deviceData);
    return await this.iotDeviceRepository.create(deviceData);
  }

  async getAllDevices(): Promise<IoTDevice[]> {
    return await this.iotDeviceRepository.findAll();
  }

  async getDeviceById(sensorId: string): Promise<IoTDevice> {
    const device = await this.iotDeviceRepository.findById(sensorId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${sensorId} not found`);
    }
    return device;
  }

  async updateDevice(sensorId: string, deviceData: Partial<IoTDevice>): Promise<IoTDevice> {
    const device = await this.iotDeviceRepository.findById(sensorId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${sensorId} not found`);
    }    await this.validateDeviceData(deviceData);
    return await this.iotDeviceRepository.update(sensorId, deviceData);
  }

  async deleteDevice(sensorId: string): Promise<void> {
    const device = await this.iotDeviceRepository.findById(sensorId);
    if (!device) {
      throw new NotFoundException(`Device with ID ${sensorId} not found`);
    }   
     await this.iotDeviceRepository.delete(sensorId);
  }

  async addSensorData(sensorId: string, sensorData: Partial<SensorData>): Promise<SensorData> {
    const device = await this.getDeviceById(sensorId);
    if (!device) {
        throw new NotFoundException(`Device with ID ${sensorId} not found`);
    }   
    const newData = await this.iotDeviceRepository.addSensorData({
      ...sensorData,
      sensor_id: sensorId,
    });

    await this.iotDeviceRepository.update(sensorId, {
      last_data_sent: newData.timestamp,
      battery_level: newData.battery_level,
    });

    return newData;
  }

  async getSensorData(sensorId: string): Promise<SensorData[]> {
    const device= await this.getDeviceById(sensorId); 
    if (!device) {
        throw new NotFoundException(`Device with ID ${sensorId} not found`);
    } 
    return await this.iotDeviceRepository.getSensorData(sensorId);
  }

  async getDevicesByBinIds(bin_ids: string[]): Promise<IoTDevice[]> {
    const devices = await Promise.all(bin_ids.map(async (bin_id) => {
        return await this.iotDeviceRepository.getDevicesByBinIds(bin_id);
    }));
    return devices;
}


  private async validateDeviceData(deviceData: Partial<IoTDevice>): Promise<void> {
    if (deviceData.bin_id) {
      await this.binService.getBinById(deviceData.bin_id);
    }
    if (deviceData.status && !Object.values(IoTDeviceStatus).includes(deviceData.status)) {
      throw new BadRequestException('Invalid device status');
    }
  }
}