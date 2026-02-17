import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BinRepository } from './bin.repository';
import { Point, Polygon } from 'geojson';
import { Bin, BinStatus } from './bin.entity';
import { ClusterService } from '../cluster/cluster.service';
import { IncidentReport, IncidentStatus } from '../incident-report/incident-report.entity';
import { IncidentReportService } from '../incident-report/incident-report.service';
import { FileService } from '../../shared/file/file.service';


@Injectable()
export class BinService {
  constructor(
    private readonly binRepository: BinRepository,
    @Inject(forwardRef(() => ClusterService))
    private readonly clusterService: ClusterService,
    @Inject(forwardRef(() => IncidentReportService))
    private readonly incidentReportService:IncidentReportService,
    private readonly fileService:FileService

  ) {}

    async createBin(binData: Partial<Bin>): Promise<Bin> {
        this.validateBinData(binData);
        const bin=await this.binRepository.create(binData)
        console.log(bin);
        
        console.log(bin);
        
        await this.clusterService.reclusterAll();
        console.log("fefrefkefefefmeıf");
        
        return bin
    }

    async getAllBins(): Promise<Bin[]> {
        return await this.binRepository.findAll();
    }

    async addReviewImages(id: string, files: Express.Multer.File[]): Promise<Bin> {
      try {
        const uploadedUrls = await this.fileService.validateAndSaveFiles(files);
        const imageUrls = uploadedUrls.map(url => url);
        return await this.binRepository.addImagesToReport(id, imageUrls);
      } catch (error) {
        console.error('Error adding review images:', error);
        throw new InternalServerErrorException('resimler eklenirken bir hata oluştu.');
      }
    }

    async getBinById(binId: string): Promise<Bin> {
        const bin = await this.binRepository.findById(binId);
        if (!bin) {
          throw new NotFoundException(`Bin with ID ${binId} not found`);
        }
        return bin;
    }

    async updateBin(binId: string, binData: Partial<Bin>): Promise<Bin> {
       const bin=await this.getBinById(binId);
        if (!bin) {
            throw new NotFoundException(`Bin with ID ${binId} not found`);
        }
        this.validateBinData(binData);
        const updated=await this.binRepository.update(binId, binData)
        await this.clusterService.reclusterAll()
        return updated
    }

    async updateBinStatus(binId: string, status: BinStatus, currentFillLevel: number): Promise<Bin> {
        const bin = await this.getBinById(binId);
        if (!bin) {
            throw new NotFoundException(`Bin with ID ${binId} not found`);
        }        
        if (!Object.values(BinStatus).includes(status)) {
          throw new BadRequestException('Invalid bin status');
        }
        if (currentFillLevel < 0 || currentFillLevel > 100) {
          throw new BadRequestException('Current fill level must be between 0 and 100');
        }
        return await this.binRepository.update(binId, { status, current_fill_level: currentFillLevel });
    }

    // async checkGeoFence(binId: string, latitude: number, longitude: number): Promise<{ isWithinFence: boolean, bin: Bin }> {
    //     const bin = await this.getBinById(binId);
    //     if (!bin) {
    //       throw new NotFoundException(`Bin with ID ${binId} not found`);
    //     }
    //     const point: Point = {
    //       type: 'Point',
    //       coordinates: [longitude, latitude]
    //     };
    //     const isWithinFence = this.isPointInPolygon(point, bin.geo_fence);
    //     if (!isWithinFence) {
    //       bin.status = BinStatus.OUT_OF_PLACE;
    //       await this.binRepository.update(binId, { status: BinStatus.OUT_OF_PLACE });
    //     }
    //     return { isWithinFence, bin };
    //   }

    async checkGeoFence(binId: string, latitude: number, longitude: number): Promise<{ isWithinFence: boolean, bin: Bin }> {
      const bin = await this.getBinById(binId);
      if (!bin) {
        throw new NotFoundException(`Bin with ID ${binId} not found`);
      }
      const point: Point = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
      const isWithinFence = this.isPointInPolygon(point, bin.geo_fence);
      if (!isWithinFence) {
        await this.handleOutOfPlaceBin(bin, latitude, longitude);
      } else if (bin.status === BinStatus.OUT_OF_PLACE) {
        // Eğer çöp kutusu tekrar çit içine girdiyse, durumunu güncelle
        await this.binRepository.update(binId, { status: BinStatus.EMPTY });
      }
      return { isWithinFence, bin: await this.getBinById(binId) };
    }


    private async handleOutOfPlaceBin(bin: Bin, latitude: number, longitude: number): Promise<void> {
      if (bin.status !== BinStatus.OUT_OF_PLACE) {
        bin.status = BinStatus.OUT_OF_PLACE;
        await this.binRepository.update(bin.bin_id, { status: BinStatus.OUT_OF_PLACE });
        
        // Rapor oluşturma
        const incidentData: Partial<IncidentReport> = {
          reported_by: 'system', // Sistem tarafından otomatik olarak rapor edildi
          bin_id: bin.bin_id,
          description: `Çöp kutusu (ID: ${bin.bin_id}) geo-fence dışına çıktı. Yeni konum: Lat ${latitude}, Lon ${longitude}`,
          status: IncidentStatus.OPEN,
        };
    
        try {
          const newIncident = await this.incidentReportService.createIncident(incidentData);
          console.log(`Yeni olay raporu oluşturuldu: ${newIncident.incident_id}`);
        } catch (error) {
          console.error('Olay raporu oluşturulurken hata oluştu:', error);
        }
      }
    }

    

    async deleteBin(binId: string): Promise<void> {
        const bin=await this.getBinById(binId); 
        if (!bin) {
         throw new NotFoundException(`Bin with ID ${binId} not found`);
       }
         await this.binRepository.delete(binId);
     }

     private isPointInPolygon(point: Point, polygon: Polygon): boolean {
      // Implement point-in-polygon algorithm here
      // This is a simple implementation and might not work for complex polygons
      let isInside = false;
      const x = point.coordinates[0], y = point.coordinates[1];
      for (let i = 0, j = polygon.coordinates[0].length - 1; i < polygon.coordinates[0].length; j = i++) {
        const xi = polygon.coordinates[0][i][0], yi = polygon.coordinates[0][i][1];
        const xj = polygon.coordinates[0][j][0], yj = polygon.coordinates[0][j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
      }
      return isInside;
    }

    private validateBinData(binData: Partial<Bin>): void {
        if (binData.location && (!this.isValidPoint(binData.location))) {
          throw new BadRequestException('Invalid location data');
        }
        if (binData.geo_fence && (!this.isValidPolygon(binData.geo_fence))) {
          throw new BadRequestException('Invalid geo_fence data');
        }
        if (binData.capacity !== undefined && (typeof binData.capacity !== 'number' || binData.capacity <= 0)) {
          throw new BadRequestException('Invalid capacity');
        }
    }


    
      private isValidPoint(point: Point): boolean {
        return point.type === 'Point' && 
               Array.isArray(point.coordinates) && 
               point.coordinates.length === 2 &&
               typeof point.coordinates[0] === 'number' &&
               typeof point.coordinates[1] === 'number';
      }
    
      private isValidPolygon(polygon: Polygon): boolean {
        return polygon.type === 'Polygon' && 
               Array.isArray(polygon.coordinates) && 
               polygon.coordinates.length > 0 &&
               polygon.coordinates[0].length >= 4 &&
               polygon.coordinates[0][0][0] === polygon.coordinates[0][polygon.coordinates[0].length - 1][0] &&
               polygon.coordinates[0][0][1] === polygon.coordinates[0][polygon.coordinates[0].length - 1][1];
      }


      async getBinsByIds(binIds: string[]): Promise<Bin[]> {
        const bins = await Promise.all(binIds.map(id => this.getBinById(id)));
        return bins.filter((bin): bin is Bin => bin !== undefined);
    }
}
