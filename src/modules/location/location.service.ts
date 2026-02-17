import { Injectable } from '@nestjs/common';
import { 
  BatchUpdateDevicePositionCommand,
  GetDevicePositionCommand,
  BatchEvaluateGeofencesCommand
} from "@aws-sdk/client-location";
import { locationClient } from '../../config/aws-location.config';
import { log } from 'console';
import { Truck } from '../truck/truck.entity';
import { Point } from 'geojson';

@Injectable()
export class LocationService {
    private trackerName: string = 'TruckTracker';
    private geofenceCollectionName: string = 'WasteCollectionGeofences';


    //! kamyondan canlı konum verilerini al 
    async getTruckPosition(truckId: string) {      
        const command = new GetDevicePositionCommand({
          TrackerName: this.trackerName,
          DeviceId: truckId
        });
    
        try {
          const response = await locationClient.send(command);
          return response.Position
        } catch (error) {
          console.error(`Error getting position for truck ${truckId}:`, error);
          return null;
        }
      }

      //! Kamyonun canlı konumunu göndermesi.
      async updateTruckPosition(truckId: string, locationData:Point): Promise<void> {
        console.log(locationData);
        
        const command = new BatchUpdateDevicePositionCommand({
          TrackerName: this.trackerName,
          Updates: [
            {
              DeviceId: truckId,
              Position:locationData.coordinates,
              SampleTime: new Date()
            }
          ]
        });    
        await locationClient.send(command);
      }



}
