import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClusterRepository } from './cluster.repository';
import { TruckService } from '../truck/truck.service';
import { BinService } from '../bin/bin.service';
import { UserService } from '../user/user.service';
import { Cluster,ClusterStatus } from '../cluster/cluster.entity';
import { KMeansService } from './cluster.kmeans.service';
import { Truck, TruckStatus } from '../truck/truck.entity';
import { Route, RouteStatus } from '../route/route.entity';
import { RouteService } from '../route/route.service';
import { BinStatus } from '../bin/bin.entity';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { SettingsService } from '../settings/settings.service';
import { CronJob } from 'cron';


@Injectable()
export class ClusterService {
    private resetJob: CronJob | null = null;
    private isInitialized = false;
    private readonly logger = new Logger(ClusterService.name);


    constructor(
        private readonly clusterRepository:ClusterRepository,
        @Inject(forwardRef(() => TruckService))
        private readonly truckService:TruckService,
        @Inject(forwardRef(() => BinService))
        private readonly binService:BinService,
        private readonly userService:UserService,
        private readonly kMeansService:KMeansService,
        @Inject(forwardRef(() => RouteService))
        private readonly routeService:RouteService,
        private readonly settingsService:SettingsService,
        private schedulerRegistry: SchedulerRegistry
    ){
      this.scheduleResetJob();

    }

    /*
    Clustering Algorithm (Kümeleme Algoritması):
      this.kMeansService.createOptimizedClusters() çağrısı, K-Means algoritmasını kullanarak tüm çöp konteynerlerini yeniden kümeler.

    Optimal Truck Allocation (Optimal Kamyon Tahsisi):
      createOptimizedClusters fonksiyonu, optimal küme sayısını ve dolayısıyla gerekli kamyon sayısını (usedTrucks) belirler.

    Cluster Updates (Küme Güncellemeleri):
      Mevcut tüm kümeler silinir: await this.clusterRepository.deleteAllClusters()
    */
    async reclusterAll(): Promise<void> {
      const { clusters, usedTrucks } = await this.kMeansService.createOptimizedClusters(); 
      const availableTrucks = await this.truckService.getAllTrucks();
  
      // Mevcut tüm kümeleri silelim
      await this.clusterRepository.deleteAllClusters()
  
      // Yeni kümeleri oluşturalım
      await Promise.all(clusters.map(async (data, index) => {
        if (index < usedTrucks) {
          const newCluster: Partial<Cluster> = {
            assigned_truck_id: availableTrucks[index]?.truck_id,
            bins: data.binIds,
            status: ClusterStatus.NOT_COLLECTED,
            collection_time: new Date().toISOString(),
          };
  
          await this.clusterRepository.create(newCluster);
        }
      }));
  
      // Kullanılmayan kamyonları idle(available) olarak işaretleyelim
      for (let i = usedTrucks; i < availableTrucks.length; i++) {
        await this.truckService.updateTruckStatus(availableTrucks[i].truck_id,TruckStatus.AVAILABLE );
      }
    }

    private async validateClusterData(clusterData: Partial<Cluster>): Promise<void> {
        if (clusterData.assigned_truck_id) {
          await this.truckService.getTruckById(clusterData.assigned_truck_id);
        }
        if (clusterData.assigned_driver_id) {
          const driver = await this.userService.getUserById(clusterData.assigned_driver_id);
          if (driver.role !== 'Driver') {
            throw new BadRequestException('Assigned user must be a driver');
          }
        }
        if (clusterData.bins) {
          for (const binId of clusterData.bins) {
            await this.binService.getBinById(binId);
          }
        }
    }

    async updateClusterStatus(clusterId: string, status: ClusterStatus): Promise<Cluster> {
        const cluster = await this.getClusterById(clusterId);
        
        if (!Object.values(ClusterStatus).includes(status)) {
          throw new BadRequestException('Invalid cluster status');
        }
    
        const updateData: Partial<Cluster> = { status };
        if (status === ClusterStatus.COMPLETED) {
          updateData.completion_time = new Date().toISOString();
        }
    
        return await this.clusterRepository.update(clusterId, updateData);
    }

    async getAllClusters(): Promise<Cluster[]> {
        return await this.clusterRepository.findAll();
    }
    
    async getClusterById(clusterId: string): Promise<Cluster> {
        const cluster = await this.clusterRepository.findById(clusterId);
        if (!cluster) {
          throw new NotFoundException(`Cluster with ID ${clusterId} not found`);
        }
        return cluster;
    }
    
    async updateCluster(clusterId: string, clusterData: Partial<Cluster>): Promise<Cluster> {
        const cluster=await this.getClusterById(clusterId); 
        if (!cluster) {
            throw new NotFoundException(`Cluster with ID ${clusterId} not found`);
          }
        await this.validateClusterData(clusterData);
        return await this.clusterRepository.update(clusterId, clusterData);
    }
    
    async deleteCluster(clusterId: string): Promise<void> {
        const cluster = await this.clusterRepository.findById(clusterId);
        if (!cluster) {
          throw new NotFoundException(`Cluster with ID ${clusterId} not found`);
        }        
        await this.clusterRepository.delete(clusterId);
    }

    async assignClusterToDriver(driverId: string): Promise<{ cluster: Cluster, route: Route }> {
      const openClusters = await this.clusterRepository.findOpenClusters(); 
      
      if (openClusters.length === 0) {
        throw new Error('No open clusters available');
      }
    
      // Burada kümeleri önceliklendirme mantığı ekleyebilirsiniz
      const clusterToAssign = openClusters[0];
    
      const updatedCluster = await this.clusterRepository.update(clusterToAssign.cluster_id, {
        status: ClusterStatus.IN_PROGRESS,
        assigned_driver_id: driverId,
      });

      // Sürücüye atanmış kamyonu al
      const truck = await this.truckService.getTruckByDriverId(driverId);

      if (!truck) {
        throw new Error('No truck assigned to this driver');
      }
    
      // Yeni rota oluştur
      const newRoute = await this.createRouteForCluster(updatedCluster, truck);
      
    
      return { cluster: updatedCluster, route: newRoute };
    }

    
    
    private async createRouteForCluster(cluster: Cluster, truck: Truck): Promise<Route> {
      const routeData: Partial<Route> = {
        cluster_id: cluster.cluster_id,
        truck_id: truck.truck_id,
        driver_id: cluster.assigned_driver_id,
        status: RouteStatus.IN_PROGRESS,  
      };
    
      return await this.routeService.createRoute(routeData);
    }

    @Cron(CronExpression.EVERY_HOUR)
    async checkAllClustersStatus() {
      console.log('Running hourly cluster status check...');
      const allClusters = await this.getAllClusters();
      for (const cluster of allClusters) {
        await this.checkAndUpdateClusterStatus(cluster.cluster_id);
      }
    }

    

    async checkAndUpdateClusterStatus(clusterId: string): Promise<void> {
      const cluster = await this.clusterRepository.findById(clusterId);
      if (!cluster) {
        console.log(`Cluster with ID ${clusterId} not found`);
        return;
      }
  
      const bins = await this.binService.getBinsByIds(cluster.bins);
      const allCollected = bins.every(bin => bin.status === BinStatus.COLLECTED);
  
      if (allCollected && cluster.status !== ClusterStatus.CLOSED) {
        await this.closeCluster(cluster);
      }
    }

    private async closeCluster(cluster: Cluster): Promise<void> {
      try {
        await this.clusterRepository.update(cluster.cluster_id, {
          status: ClusterStatus.CLOSED,
        });
    
        // Opsiyonel: Tamamlanma raporu oluştur
      } catch (error) {
        console.error(`Error closing cluster ${cluster.cluster_id}:`, error);
      }
    }
    async onModuleInit() {
      if (!this.isInitialized) {
          await this.scheduleResetJob();
          this.isInitialized = true;
      }
    }

    private async scheduleResetJob() {
        try {
            const resetTime = await this.settingsService.getResetTime();
            this.logger.log(`Fetched reset time: ${resetTime}`);

            const [hours, minutes] = resetTime.split(':').map(Number);

            if (isNaN(hours) || isNaN(minutes)) {
                this.logger.error(`Invalid reset time format: ${resetTime}`);
                return;
            }

            const cronExpression = `${minutes} ${hours} * * *`;

            this.removeExistingJob();

            this.logger.log('Creating new reset job');
            this.resetJob = new CronJob(cronExpression, () => {
                this.resetAllClusters();
            });

            this.schedulerRegistry.addCronJob('resetClusters', this.resetJob);
            
            // Start the job
            this.resetJob.start();
            this.logger.log(`Daily cluster reset scheduled for ${resetTime}`);
        } catch (error) {
            this.logger.error(`Error scheduling reset job: ${error.message}`);
        }
    }

    private removeExistingJob() {
        try {
            const existingJob = this.schedulerRegistry.getCronJob('resetClusters');
            if (existingJob) {
                this.logger.log('Stopping and removing existing reset job');
                existingJob.stop();
                this.schedulerRegistry.deleteCronJob('resetClusters');
            }
        } catch (error) {
            this.logger.log('No existing reset job found');
        }
    }

    private async resetAllClusters() {
        this.logger.log('Resetting all clusters to NOT_COLLECTED status...');
        try {
            const allClusters = await this.clusterRepository.findAll();
            for (const cluster of allClusters) {
                await this.clusterRepository.update(cluster.cluster_id, {
                    status: ClusterStatus.NOT_COLLECTED
                });
                this.logger.log(`Cluster ${cluster.cluster_id} has been reset to NOT_COLLECTED.`);
            }
        } catch (error) {
            this.logger.error(`Error resetting clusters: ${error.message}`);
        }
    }

    async updateResetSchedule() {
        await this.scheduleResetJob();
    }
  
    async checkCollectionTime(): Promise<void> {
      const uncollectedClusters = await this.clusterRepository.findByStatus(ClusterStatus.NOT_COLLECTED);
      const currentTime = new Date();
  
      for (const cluster of uncollectedClusters) {
        if (new Date(cluster.collection_time) <= currentTime) {
          await this.handleMissedCollection(cluster);
        }
      }
    }

    private async handleMissedCollection(cluster: Cluster): Promise<void> {
      // Send notification to admin

  
      // Reset cluster status
      await this.clusterRepository.update(cluster.cluster_id, { status: ClusterStatus.NOT_COLLECTED });
  
      // Reset bin statuses and handle automatic collection for empty bins

    }

}
