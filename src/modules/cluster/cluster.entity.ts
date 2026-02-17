export enum ClusterStatus {
    NOT_COLLECTED = 'Not Collected',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    MISSED = 'Missed',
    CLOSED='Closed'
}

export interface Cluster {
    cluster_id: string;
    assigned_truck_id: string;
    assigned_driver_id: string;
    bins: string[];
    status: ClusterStatus;
    collection_time: string;
    completion_time?: string;
    created_at: number;
    updated_at: string;
}