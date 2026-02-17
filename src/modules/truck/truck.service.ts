import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TruckRepository } from './truck.repository';
import { Truck, TruckStatus } from './truck.entity';
import { LocationService } from '../location/location.service';
import { ClusterService } from '../cluster/cluster.service';
import { Point } from 'geojson';

@Injectable()
export class TruckService {
    constructor(
        private readonly truckRepository:TruckRepository,
        private readonly locationService:LocationService,
        @Inject(forwardRef(() => ClusterService))
        private readonly clusterService: ClusterService
    ){}

    async createTruck(truckData: Partial<Truck>): Promise<Truck> {
        const newTruck = await this.truckRepository.create(truckData);
        await this.clusterService.reclusterAll();
        return newTruck;    
    }

    async getAllTrucks(): Promise<Truck[]> {
        return await this.truckRepository.findAll();
    }

    async getAvailableTrucks(): Promise<Truck[]> {
        return await this.truckRepository.getAvailableTrucks();
      }

    async getTruckById(truckId: string): Promise<Truck> {
        const truck = await this.truckRepository.findById(truckId);
        if (!truck) {
          throw new NotFoundException(`Truck with ID ${truckId} not found`);
        }
        return truck;
    }

    async updateTruck(truckId: string, truckData: Partial<Truck>): Promise<Truck> {
        const truck=await this.getTruckById(truckId);
        if (!truck) {
            throw new NotFoundException(`Truck with ID ${truckId} not found`);
        }
        const updatedTruck = await this.truckRepository.update(truckId, truckData);
        return updatedTruck;
    }

    async deleteTruck(truckId: string): Promise<void> {
        const truck=await this.getTruckById(truckId); 
        if (!truck) {
            throw new NotFoundException(`Truck with ID ${truckId} not found`);
        }
        await this.truckRepository.delete(truckId);
    }

    async updateTruckStatus(truckId: string, status: TruckStatus): Promise<Truck> {
        const truck = await this.getTruckById(truckId);
        if (!truck) {
            throw new NotFoundException(`Truck with ID ${truckId} not found`);
        }
        if (!Object.values(TruckStatus).includes(status)) {
          throw new BadRequestException('Invalid truck status');
        }
        return await this.truckRepository.update(truckId, { status });
    }

    // !Kamyonun canlı konumunu göndermesi.
    async updateTruckLocation(truckId: string,locationData:Point): Promise<void> {
        console.log(locationData);
        

        //connect trucktracker in aws 
        await this.locationService.updateTruckPosition(truckId,locationData);
        
        // Update truck in your database
        await this.truckRepository.update(truckId, {
           current_location: locationData
        });
    }

     //! kamyondan canlı konum verilerini al 
    async getTruckLocation(truckId: string) {
        //get location from trucktracker
        return await this.locationService.getTruckPosition(truckId);
    }

    async getTruckByDriverId(driverId: string) {
        try {
            return await this.truckRepository.getTruckByDriverId(driverId)
        } catch (error) {
            throw new Error(error.message)
        }

    }
    

    
}
