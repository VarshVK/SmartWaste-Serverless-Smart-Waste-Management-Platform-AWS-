import { Point } from 'geojson';

export enum TruckStatus {
  AVAILABLE = 'Available',
  IN_USE = 'In Use',
  UNDER_MAINTENANCE = 'Under Maintenance'}

export interface Truck {
  truck_id: string;
  license_plate: string;
  make_model: string;
  capacity: number;
  status: TruckStatus;
  current_location: Point;
  last_maintenance_date: number;
  next_maintenance_due: number;
  assigned_driver_id: string;
  created_at: number;
  updated_at: number;
}