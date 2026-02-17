export enum RouteStatus {
    PENDING = 'Pending',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
  }
  
export interface Route {
    route_id: string;
    truck_id: string;
    driver_id: string;
    cluster_id: string;
    route_start_time: string;
    route_end_time?: string;
    stops: string[];
    status: RouteStatus;
    total_distance: number;
    fuel_consumption: number;
    created_at: number;
    updated_at: number;

}

