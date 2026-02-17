import { Test, TestingModule } from '@nestjs/testing';
import { IoTDataMappingService } from './iot-data-mapping.service';
import { BinService } from '../bin/bin.service';
import { IoTDeviceService } from './iot-device.service';
import { SensorData } from './sensor-data.entity';
import { Bin, BinStatus } from '../bin/bin.entity';
import { IoTDevice, IoTDeviceStatus } from './iot-devive.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('IoTDataMappingService', () => {
  let service: IoTDataMappingService;
  let binService: jest.Mocked<BinService>;
  let iotDeviceService: jest.Mocked<IoTDeviceService>;

  const mockSensorData: SensorData = {
    data_id: 'data1',
    sensor_id: 'sensor1',
    location: { type: 'Point', coordinates: [30.000100, 40.000100] },
    fill_level: 75,
    battery_level: 80,
    timestamp: '2023-05-01T12:00:00Z',
  };

  const mockBin: Bin = {
    bin_id: 'bin1',
    location: { type: 'Point', coordinates: [30.000000, 40.000000] },
    geo_fence: { type: 'Polygon', coordinates: [[]] },
    capacity: 100,
    current_fill_level: 50,
    status: BinStatus.FULL,
    sensor_id: 'sensor1',
    last_collected_at: 1620000000000,
    created_at: 1620000000000,
    updated_at: 1620000000000,
  };

  const mockDevice: IoTDevice = {
    sensor_id: 'sensor1',
    bin_id: 'bin1',
    device_type: 'fill_level_sensor',
    battery_level: 90,
    status: IoTDeviceStatus.ACTIVE,
    last_data_sent: '2023-04-30T12:00:00Z',
    last_maintenance: '2023-04-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-04-30T12:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IoTDataMappingService,
        {
          provide: BinService,
          useValue: {
            getAllBins: jest.fn(),
            updateBin: jest.fn(),
          },
        },
        {
          provide: IoTDeviceService,
          useValue: {
            getDeviceById: jest.fn(),
            updateDevice: jest.fn(),
            getAllDevices: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IoTDataMappingService>(IoTDataMappingService);
    binService = module.get(BinService) as jest.Mocked<BinService>;
    iotDeviceService = module.get(IoTDeviceService) as jest.Mocked<IoTDeviceService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapDataToBin', () => {
    it('should map sensor data to the nearest bin and update both bin and device', async () => {
      iotDeviceService.getDeviceById.mockResolvedValue(mockDevice);
      
      // findNearestBin fonksiyonunu mock edelim
      jest.spyOn(service, 'findNearestBin').mockResolvedValue(mockBin);
      
      binService.updateBin.mockResolvedValue(mockBin);
      iotDeviceService.updateDevice.mockResolvedValue(mockDevice);

      const result = await service.mapDataToBin(mockSensorData);

      expect(result).toEqual(mockBin);
      expect(service.findNearestBin).toHaveBeenCalledWith(
        mockSensorData.location.coordinates[0],
        mockSensorData.location.coordinates[1]
      );
      expect(binService.updateBin).toHaveBeenCalledWith('bin1', expect.any(Object));
      expect(iotDeviceService.updateDevice).toHaveBeenCalledWith('sensor1', expect.any(Object));
    });

    it('should throw NotFoundException if device is not found', async () => {
      iotDeviceService.getDeviceById.mockResolvedValue(null);

      await expect(service.mapDataToBin(mockSensorData)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no nearby bin is found', async () => {
      iotDeviceService.getDeviceById.mockResolvedValue(mockDevice);
      jest.spyOn(service, 'findNearestBin').mockResolvedValue(null);

      await expect(service.mapDataToBin(mockSensorData)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findNearestBin', () => {
    it('should find the nearest bin within the maximum distance', async () => {
      const mockBins = [
        { ...mockBin, bin_id: 'bin1', location: { type: 'Point', coordinates: [30.0000, 40.0000] } },
        { ...mockBin, bin_id: 'bin2', location: { type: 'Point', coordinates: [30.0002, 40.0002] } },
      ];
      binService.getAllBins.mockResolvedValue(mockBins);
  
      const result = await service.findNearestBin(40.0001, 30.0001);

      expect(result).toEqual(mockBins[1]); 
      expect(binService.getAllBins).toHaveBeenCalled();
    });
  
    it('should return null if no bin is found within the maximum distance', async () => {
      const mockBins = [
        { ...mockBin, location: { type: 'Point', coordinates: [30.001, 40.001] } },
      ];
      binService.getAllBins.mockResolvedValue(mockBins);
  
      const result = await service.findNearestBin(40.000, 30.000);
  
      expect(result).toBeNull();
      expect(binService.getAllBins).toHaveBeenCalled();
    });
  });

  describe('checkUnmatchedBins', () => {
    it('should not throw an error if all bins are matched', async () => {
      binService.getAllBins.mockResolvedValue([mockBin]);
      iotDeviceService.getAllDevices.mockResolvedValue([mockDevice]);

      await expect(service.checkUnmatchedBins()).resolves.not.toThrow();
    });

    it('should throw BadRequestException if there are unmatched bins', async () => {
      const unmatchedBin = { ...mockBin, bin_id: 'unmatched_bin' };
      binService.getAllBins.mockResolvedValue([mockBin, unmatchedBin]);
      iotDeviceService.getAllDevices.mockResolvedValue([mockDevice]);

      await expect(service.checkUnmatchedBins()).rejects.toThrow(BadRequestException);
    });
  });

  describe('processAllSensorData', () => {
    it('should process all sensor data and check for unmatched bins', async () => {
      const mapDataToBinSpy = jest.spyOn(service, 'mapDataToBin').mockResolvedValue(mockBin);
      const checkUnmatchedBinsSpy = jest.spyOn(service, 'checkUnmatchedBins').mockResolvedValue();

      await service.processAllSensorData([mockSensorData, mockSensorData]);

      expect(mapDataToBinSpy).toHaveBeenCalledTimes(2);
      expect(checkUnmatchedBinsSpy).toHaveBeenCalled();
    });

    it('should continue processing even if one sensor data fails', async () => {
      const mapDataToBinSpy = jest.spyOn(service, 'mapDataToBin')
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce(mockBin);
      const checkUnmatchedBinsSpy = jest.spyOn(service, 'checkUnmatchedBins').mockResolvedValue();

      await service.processAllSensorData([mockSensorData, mockSensorData]);

      expect(mapDataToBinSpy).toHaveBeenCalledTimes(2);
      expect(checkUnmatchedBinsSpy).toHaveBeenCalled();
    });
  });
});