import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BinService } from './../bin/bin.service';
import { TruckService } from '../truck/truck.service';
import { Bin } from '../bin/bin.entity';
import { kmeans } from 'ml-kmeans';
import { RouteOptimizerService } from '../route/route-optimizer.service';
import { Truck } from '../truck/truck.entity';

@Injectable()
export class KMeansService {
  constructor(
    @Inject(forwardRef(() => BinService))
    private readonly binService: BinService,
    @Inject(forwardRef(() => TruckService))
    private readonly truckService: TruckService,
    @Inject(forwardRef(() => RouteOptimizerService))
    private readonly routeOptimizerService:RouteOptimizerService
  ) {}

  // Optimize edilmiş kümeleri oluşturan ana fonksiyon
  async createOptimizedClusters(): Promise<{ clusters: { clusterId: string; binIds: string[]; truckId: string }[], usedTrucks: number }> {
    // Tüm çöp kutularını ve mevcut kamyonları al
    const bins = await this.binService.getAllBins();        
    const availableTrucks = await this.truckService.getAvailableTrucks();
    availableTrucks.sort((a, b) => b.capacity - a.capacity);    

    let bestClusters: { bins: Bin[]; truckId: string }[] = [];
    let bestScore = Infinity;

    // En iyi kümeleme sonucunu bulmak için farklı kamyon sayılarıyla deneme yap
    for (let k = 1; k <= availableTrucks.length; k++) {
      const selectedTrucks = availableTrucks.slice(0, k);
      const kMeansClusters = this.kMeansAlgorithm(bins, k);
      const capacityClusters = await this.capacityBasedClustering(kMeansClusters, selectedTrucks);
      const score = await this.evaluateClustering(capacityClusters);      
      
      if (score < bestScore) {
        bestScore = score;
        bestClusters = capacityClusters;
      } else {
        break;
      }
    }    

    // Sonuçları istenilen formata dönüştür
    const result = bestClusters.map((cluster, index) => ({
      clusterId: `cluster_${index}`,
      binIds: cluster.bins.map(bin => bin.bin_id),
      truckId: cluster.truckId
    }));

    

    return {
      clusters: result,
      usedTrucks: bestClusters.length
    };
  }

  // Kapasite bazlı kümeleme yapan yardımcı fonksiyon
  private async capacityBasedClustering(kMeansClusters: Bin[][], trucks: Truck[]): Promise<{ bins: Bin[]; truckId: string }[]> {
    const capacityClusters: { bins: Bin[]; truckId: string }[] = trucks.map(truck => ({ bins: [], truckId: truck.truck_id }));
    
    // Her bir K-means kümesi için
    for (const kMeansCluster of kMeansClusters) {
      kMeansCluster.sort((a, b) => b.capacity - a.capacity);
      
      // Her bir çöp kutusu için en uygun kamyonu bul
      for (const bin of kMeansCluster) {
        let assigned = false;
        for (const capacityCluster of capacityClusters) {
          const truck = trucks.find(t => t.truck_id === capacityCluster.truckId);
          if (truck) {
            const clusterCapacity = capacityCluster.bins.reduce((sum, b) => sum + b.capacity, 0);
            const truckCapacityLiters = truck.capacity * 1000;
            
            if (clusterCapacity + bin.capacity <= truckCapacityLiters) {
              capacityCluster.bins.push(bin);
              assigned = true;
              break;
            }
          }
        }
        // Eğer uygun kamyon bulunamazsa, en az dolu olan kümeye ekle
        if (!assigned) {
          const leastFilledCluster = capacityClusters.reduce((min, cluster) => {
            const clusterCapacity = cluster.bins.reduce((sum, b) => sum + b.capacity, 0);
            const minCapacity = min.bins.reduce((sum, b) => sum + b.capacity, 0);
            return clusterCapacity < minCapacity ? cluster : min;
          });
          leastFilledCluster.bins.push(bin);
        }
      }
    }
    
    return capacityClusters;
  }

  // K-means algoritmasını uygulayan fonksiyon
  private kMeansAlgorithm(bins: Bin[], k: number): Bin[][] {

    const points = bins.map(bin => bin.location.coordinates as [number, number]);    

    const result = kmeans(points, k, {
      maxIterations: 100,
      tolerance: 0.0001
    });

    // Sonuçları Bin nesneleri olarak grupla
    const clusters: Bin[][] = Array.from({ length: k }, () => []);
    result.clusters.forEach((clusterIndex, i) => {
      clusters[clusterIndex].push(bins[i]);
    });
        
    return clusters;
  }

  // Kümeleme sonuçlarını değerlendiren fonksiyon
  private async evaluateClustering(clusters: { bins: Bin[]; truckId: string }[]): Promise<number> {
    let totalScore = 0;
    const avgSize = clusters.reduce((sum, cluster) => sum + cluster.bins.length, 0) / clusters.length;

    for (const cluster of clusters) {
      const sizeVariance = Math.pow(cluster.bins.length - avgSize, 2);
      
      if (cluster.bins.length > 0) {
        const truckLocation = (await this.truckService.getTruckById(cluster.truckId)).current_location.coordinates as [number, number];
        const binIds = cluster.bins.map(bin => bin.bin_id);
        try {
          // Rota optimizasyonu yap ve toplam mesafeyi hesapla
          const { totalDistance } = await this.routeOptimizerService.optimizeRoute(truckLocation, binIds);
          
          // Kamyon kapasitesi kullanımını hesapla
          const truck = await this.truckService.getTruckById(cluster.truckId);
          const clusterCapacity = cluster.bins.reduce((sum, b) => sum + b.capacity, 0);
          const truckCapacityLiters = truck.capacity * 1000;
          const capacityUtilization = clusterCapacity / truckCapacityLiters;
          
          // Küme boyutu varyansı, rota mesafesi ve kapasite kullanımını birleştiren bir skor hesapla
          const clusterScore = sizeVariance + (totalDistance / 1000) + Math.abs(1 - capacityUtilization) * 1000;
          totalScore += clusterScore;
        } catch (error) {
          console.error(`Küme için rota optimizasyonu hatası: ${error.message}`);
          totalScore += sizeVariance + 1000000; // Büyük bir ceza puanı ekle
        }
      } else {
        totalScore += sizeVariance;
      }
    }

    return totalScore / clusters.length;
  }
}
