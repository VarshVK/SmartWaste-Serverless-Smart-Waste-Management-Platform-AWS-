export enum IncidentStatus {
    OPEN = 'Open',
    IN_PROGRESS = 'In Progress',
    RESOLVED = 'Resolved',
    CLOSED = 'Closed',
  }
  
  export interface IncidentReport {
    incident_id: string;
    reported_by: string;
    bin_id: string;
    description: string;
    status: IncidentStatus;
    reported_at: string;
    resolved_at?: string;
    images?: string[];
    created_at: string;
    updated_at: string;
  }