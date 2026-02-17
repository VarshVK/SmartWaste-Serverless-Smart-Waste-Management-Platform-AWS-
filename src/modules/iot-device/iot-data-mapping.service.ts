import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Bin } from '../bin/bin.entity';
import { SensorData } from './sensor-data.entity';
import { BinService } from '../bin/bin.service';
import { IoTDeviceService } from './iot-device.service';

@Injectable()
export class IoTDataMappingService {

  constructor(
    private binService: BinService,
    private iotDeviceService: IoTDeviceService
  ) {}

  async mapDataToBin(sensorData: SensorData): Promise<Bin> {
    const device = await this.iotDeviceService.getDeviceById(sensorData.sensor_id);
    if (!device) {
      throw new NotFoundException(`Device with ID ${sensorData.sensor_id} not found`);
    }

    const nearestBin = await this.findNearestBin(sensorData.location.coordinates[0], sensorData.location.coordinates[1]);
    
    if (!nearestBin) {
      throw new BadRequestException('No nearby bin found for the given coordinates');
    }

    // Çöp konteynerini güncelle
    await this.binService.updateBin(nearestBin.bin_id, {
      current_fill_level: sensorData.fill_level,
      updated_at: Date.now()
    });

    // IoT cihazını güncelle
    await this.iotDeviceService.updateDevice(device.sensor_id, {
      bin_id: nearestBin.bin_id,
      last_data_sent: sensorData.timestamp,
      battery_level: sensorData.battery_level
    });

    return nearestBin;
  }

  public async findNearestBin(latitude: number, longitude: number): Promise<Bin | null> {
    const MAX_DISTANCE = 20; // metre cinsinden maksimum mesafe
  
    const allBins = await this.binService.getAllBins();
  
    let nearestBin: Bin | null = null;
    let minDistance = Infinity;
  
    for (const bin of allBins) {
      const binLat = bin.location.coordinates[1]; // Latitude
      const binLon = bin.location.coordinates[0]; // Longitude
      const distance = this.calculateDistance(latitude, longitude, binLat, binLon);
  
      if (distance <= MAX_DISTANCE && distance < minDistance) {
        minDistance = distance;
        nearestBin = bin;
      }
    }
  
    return nearestBin;
  }
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = this.toRadians(lat1);
    const φ2 = this.toRadians(lat2);
    const Δφ = this.toRadians(lat2 - lat1);
    const Δλ = this.toRadians(lon2 - lon1);
  
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // Distance in meters
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async checkUnmatchedBins(): Promise<void> {
    const allBins = await this.binService.getAllBins();
    const allDevices = await this.iotDeviceService.getAllDevices();

    const unmatchedBins = allBins.filter(bin => 
      !allDevices.some(device => device.bin_id === bin.bin_id)
    );

    if (unmatchedBins.length > 0) {
      throw new BadRequestException(`There are ${unmatchedBins.length} unmatched bins`);
    }
  }

  async processAllSensorData(sensorDataList: SensorData[]): Promise<void> {
    for (const sensorData of sensorDataList) {
      try {
        await this.mapDataToBin(sensorData);
      } catch (error) {
        console.error(`Error processing sensor data for sensor ${sensorData.sensor_id}:`, error.message);
      }
    }

    await this.checkUnmatchedBins();
  }
}