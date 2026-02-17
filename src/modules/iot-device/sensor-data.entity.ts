import { Point } from 'geojson';

export interface SensorData {
  data_id: string;
  sensor_id: string;
  location: Point;
  fill_level: number;
  battery_level: number;
  timestamp: string;
}

