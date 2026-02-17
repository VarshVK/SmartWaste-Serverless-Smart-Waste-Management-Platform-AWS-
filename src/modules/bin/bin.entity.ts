import { Point, Polygon } from 'geojson';

export enum BinStatus {
  EMPTY = 'Empty',
  PARTIALLY_FULL = 'Partially Full',
  FULL = 'Full',
  OVERFLOW = 'Overflow',
  DAMAGED = 'Damaged',
  OUT_OF_PLACE = 'Out of Place',
  COLLECTED='Collected'
}

export interface Bin {
  bin_id: string;
  location: Point;
  geo_fence: Polygon;
  capacity: number;
  current_fill_level: number;
  status: BinStatus;
  sensor_id: string;
  last_collected_at: number;
  created_at: number;
  updated_at: number;
  images?: string[];
}