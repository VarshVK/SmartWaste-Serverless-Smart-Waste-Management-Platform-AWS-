import { Injectable } from '@nestjs/common';
import { locationClient } from '../../config/aws-location.config';
import { BinService } from '../bin/bin.service';
import { IoTDeviceService } from '../iot-device/iot-device.service';
import { CalculateRouteMatrixCommand } from '@aws-sdk/client-location';
import { Bin } from '../bin/bin.entity';
import { IoTDevice } from '../iot-device/iot-devive.entity';



@Injectable()
export class RouteOptimizerService {
    private routeCalculatorName: string = 'TruckRouteCalculator'; 
    private maxLocations: number = 10; // AWS Location Service sınırı


    constructor(
        private binService: BinService,
        private iotDeviceService: IoTDeviceService
    ) {}


  // // Rota optimizasyonu için ana fonksiyon
  //   async optimizeRoute(
  //       truckLocation: [number, number],
  //       binIds: string[]
  //   ):Promise<{ route: string[], totalDistance: number }>{

  //       // Verilen ID'lere göre çöp kutularını al
  //       const bins=await Promise.all(binIds.map(id=>{
  //           return this.binService.getBinById(id)
  //       }))

  //       //console.log("bins",bins.length);
        

  //       // Kamyon konumu ve çöp kutusu konumlarını birleştir
  //       const locations = [truckLocation, ...bins.map(bin => bin.location.coordinates)];
  //       console.log(locations);
        

  //       // Amazon Location Service için rota matrisi hesaplama komutu oluştur
  //       const command=new CalculateRouteMatrixCommand({
  //           CalculatorName:this.routeCalculatorName,
  //           DeparturePositions:locations,
  //           DestinationPositions:locations
  //       })

  //       // Rota matrisini hesapla
  //       const response=await locationClient.send(command)
  //       console.log('response route matrix',response.RouteMatrix);
        
  //       const routeMatrix: number[][] = response.RouteMatrix.map(row => 
  //           row.map(entry => entry.Distance ?? Infinity) // If Distance is undefined, set it to Infinity
  //       );
        
  //       // Optimum rotayı bul
  //       const truckIndex = 0
  //       const { route, totalDistance } = this.calculateShortestRoute(routeMatrix, binIds, truckIndex);
        
  //      // const optimizedRoute = this.calculateShortestRoute(routeMatrix, binIds, truckIndex);
  //      //console.log('Optimized route:', route);
  //      //console.log('Total distance:', totalDistance);
        
  //       return { route, totalDistance };

  //   }

  async optimizeRoute(
    truckLocation: [number, number],
    binIds: string[]
): Promise<{ route: string[], totalDistance: number }> {
    const bins = await Promise.all(binIds.map(id => this.binService.getBinById(id)));
    const locations = [truckLocation, ...bins.map(bin => bin.location.coordinates)];

    let optimizedRoute: string[] = [];
    let totalDistance = 0;
    let currentLocation = truckLocation;

    while (locations.length > 1) { // truck location + at least one bin
        const chunkSize = Math.min(this.maxLocations, locations.length);
        const locationChunk = locations.slice(0, chunkSize);

        const { route, distance } = await this.optimizeChunk(currentLocation, locationChunk, binIds);
        
        optimizedRoute = optimizedRoute.concat(route);
        totalDistance += distance;

        // Update for next iteration
        currentLocation = locationChunk[route[route.length - 1]] as [number, number];
        locations.splice(1, route.length); // Remove processed bins, keep truck location
        binIds = binIds.filter(id => !route.includes(id));
    }

    return { route: optimizedRoute, totalDistance };
}

private async optimizeChunk(
  startLocation: [number, number],
  locations: [number, number][],
  binIds: string[]
): Promise<{ route: string[], distance: number }> {
  const command = new CalculateRouteMatrixCommand({
      CalculatorName: this.routeCalculatorName,
      DeparturePositions: locations,
      DestinationPositions: locations
  });

  const response = await locationClient.send(command);
  const routeMatrix: number[][] = response.RouteMatrix.map(row => 
      row.map(entry => entry.Distance ?? Infinity)
  );

  const { route, totalDistance } = this.calculateShortestRoute(routeMatrix, binIds, 0);
  return { route, distance: totalDistance };
}

    // private calculateShortestRoute(routeMatrix: number[][], binIds: string[], truckIndex: number): { route: string[], totalDistance: number } {
    //   const n = routeMatrix.length; // Rota matrisinin boyutunu al (çöp kutuları + kamyon)
    //   const optimizedRoute: string[] = []; // Optimize edilmiş rotayı tutacak dizi
    //   const unvisited = new Set(Array.from({ length: n }, (_, i) => i).filter(i => i !== truckIndex)); // Ziyaret edilmemiş düğümleri tutan set, kamyonun pozisyonu hariç
    
    //   let currentIndex = truckIndex; // Kamyonun başlangıç pozisyonunu al
    //   let totalDistance = 0;

    
    //   while (unvisited.size > 0) { // Ziyaret edilmemiş tüm noktalar bitene kadar devam et
    //     let nextIndex = -1;
    //     let minDistance = Infinity;
    
    //     // Ziyaret edilmemiş noktalar arasından en yakını bul
    //     for (const index of unvisited) {
    //       if (routeMatrix[currentIndex][index] < minDistance) {
    //         minDistance = routeMatrix[currentIndex][index]; // Minimum mesafeyi güncelle
    //         nextIndex = index; // En yakın düğümü güncelle
    //       }
    //     }
    
    //     if (nextIndex !== -1) {
    //       if (nextIndex !== 0) { // Kamyonun pozisyonunu rotaya eklemeyi atla
    //         optimizedRoute.push(binIds[nextIndex - 1]); // Bin ID'sini optimize edilmiş rotaya ekle
    //       }
    //       totalDistance+=minDistance
    //       unvisited.delete(nextIndex); // Ziyaret edilen düğümü listeden çıkar
    //       currentIndex = nextIndex; // Şu anki pozisyonu güncelle
    //     } else {
    //       console.error("Bir sonraki durağı bulamıyorum"); // Eğer bir sonraki düğüm bulunamazsa hata ver
    //       break;
    //     }
    //   }
        
    //   return { route: optimizedRoute, totalDistance };; // Optimize edilmiş rotayı döndür
    // }

    private calculateShortestRoute(routeMatrix: number[][], binIds: string[], startIndex: number): { route: string[], totalDistance: number } {
      const n = routeMatrix.length;
      const optimizedRoute: string[] = [];
      const unvisited = new Set(Array.from({ length: n }, (_, i) => i).filter(i => i !== startIndex));
      
      let currentIndex = startIndex;
      let totalDistance = 0;

      while (unvisited.size > 0) {
          let nextIndex = -1;
          let minDistance = Infinity;

          for (const index of unvisited) {
              if (routeMatrix[currentIndex][index] < minDistance) {
                  minDistance = routeMatrix[currentIndex][index];
                  nextIndex = index;
              }
          }

          if (nextIndex !== -1) {
              if (nextIndex !== 0) {
                  optimizedRoute.push(binIds[nextIndex - 1]);
              }
              totalDistance += minDistance;
              unvisited.delete(nextIndex);
              currentIndex = nextIndex;
          } else {
              console.error("Bir sonraki durağı bulamıyorum");
              break;
          }
      }

      return { route: optimizedRoute, totalDistance };
  }

}


    

    










