export enum IoTDeviceStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
    MALFUNCTIONING = 'Malfunctioning',
  }
  
export interface IoTDevice {
    sensor_id: string;
    bin_id: string;
    device_type: string;
    battery_level: number;
    status: IoTDeviceStatus;
    last_data_sent: string;
    last_maintenance: string;
    created_at: string;
    updated_at: string;
}




