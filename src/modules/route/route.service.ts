import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RouteRepository } from './route.repository';
import { UserService } from '../user/user.service';
import { ClusterService } from '../cluster/cluster.service';
import { TruckService } from '../truck/truck.service';
import { Route, RouteStatus } from './route.entity';
import { RouteOptimizerService } from './route-optimizer.service';
import { BinService } from '../bin/bin.service';


@Injectable()
export class RouteService {
    constructor(
        private readonly routeRepository:RouteRepository,
        private readonly userService:UserService,
        @Inject(forwardRef(() => ClusterService))
        private readonly clusterService:ClusterService,
        @Inject(forwardRef(() => TruckService))
        private readonly truckService:TruckService,
        private readonly routeOptimizerService: RouteOptimizerService,
        private readonly binService:BinService

    ) {}

    private async validateRouteData(routeData: Partial<Route>): Promise<void> {
        if (routeData.truck_id) {
          await this.truckService.getTruckById(routeData.truck_id);
        }
        if (routeData.driver_id) {
          const driver = await this.userService.getUserById(routeData.driver_id);
          if (driver.role !== 'Driver') {
            throw new BadRequestException('Assigned user must be a driver');
          }
        }
        if (routeData.cluster_id) {
          await this.clusterService.getClusterById(routeData.cluster_id);
        }
    }

    async createRoute(routeData: Partial<Route>): Promise<Route> {
      await this.validateRouteData(routeData);
      
      // Verilen ID'ye göre kamyonu getir
      const truck = await this.truckService.getTruckById(routeData.truck_id);  
      //console.log(truck);
          
      
      // Verilen cluster ID'sine ait çöp kutularını getir
      const cluster = await this.clusterService.getClusterById(routeData.cluster_id);
      //console.log(cluster);
      
      
      // Fetch full bin information
      const bins = await this.binService.getBinsByIds(cluster.bins);     
      //console.log(bins);
      
 
      // Kamyonun mevcut konumunu al
      
      const truckLocation = truck.current_location.coordinates;
      //console.log(truckLocation);
      
      
      // Çöp kutusu ID'lerini bir diziye dönüştür
      const binIds = bins.map(bin => bin.bin_id);      
  
      // Rota optimizasyon servisini kullanarak optimize edilmiş durakları al
      const { route: optimizedStops, totalDistance } = await this.routeOptimizerService.optimizeRoute(truckLocation, binIds);

      routeData.route_start_time = new Date().toISOString();
      routeData.stops = optimizedStops;
      routeData.total_distance = totalDistance; 
      console.log("deneme data,",routeData);
           

      // Yeni rotayı veritabanında oluştur ve döndür
      const route= await this.routeRepository.create(routeData);
      //console.log(route);
      return route
      
    }

    async getRoutesByDriverId(driverId: string): Promise<Route[]> {
      return await this.routeRepository.findByDriverId(driverId);
    }
    
    async getAllRoutes(): Promise<any[]> {
      const routes = await this.routeRepository.findAll();
      return Promise.all(routes.map(route => this.addAdditionalData(route)));
    }

    private async addAdditionalData(route: Route): Promise<any> {
      const binLocations = await Promise.all(route.stops.map(async (binId) => {
        const bin = await this.binService.getBinById(binId);
        return {
          binId: bin.bin_id,
          location: bin.location
        };
      }));
  
      const truck = await this.truckService.getTruckById(route.truck_id);
  
      return {
        ...route,
        binLocations,
        truckLocation: truck.current_location
      };
    }
    
    async getRouteById(routeId: string): Promise<any> {
      const route = await this.routeRepository.findById(routeId);
      if (!route) {
        throw new NotFoundException(`Route with ID ${routeId} not found`);
      }      
      // Fetch bin locations
      const binLocations = await Promise.all(route.stops.map(async (binId) => {
        const bin = await this.binService.getBinById(binId);
        return {
          binId: bin.bin_id,
          location: bin.location
        };
      }));    
      // Fetch truck's current location
      const truck = await this.truckService.getTruckById(route.truck_id);
    
      return {
        ...route,
        binLocations,
        truckLocation: truck.current_location
      };
    }
    
    async updateRoute(routeId: string, routeData: Partial<Route>): Promise<Route> {
        const route = await this.routeRepository.findById(routeId);
        if (!route) {
          throw new NotFoundException(`Route with ID ${routeId} not found`);
        }
        await this.validateRouteData(routeData);
        return await this.routeRepository.update(routeId, routeData);
    }
    
    async deleteRoute(routeId: string): Promise<void> {
        const route = await this.routeRepository.findById(routeId);
        if (!route) {
          throw new NotFoundException(`Route with ID ${routeId} not found`);
        }
        await this.routeRepository.delete(routeId);
    }
    
    async updateRouteStatus(routeId: string, status: RouteStatus): Promise<Route> {
        const route = await this.routeRepository.findById(routeId);
        if (!route) {
          throw new NotFoundException(`Route with ID ${routeId} not found`);
        }
        
        if (!Object.values(RouteStatus).includes(status)) {
          throw new BadRequestException('Invalid route status');
        }
    
        const updateData: Partial<Route> = { status };
        if (status === RouteStatus.COMPLETED) {
          updateData.route_end_time = new Date().toISOString();
        }
    
        return this.routeRepository.update(routeId, updateData);
    }












}
