export enum UserRole {
    ADMIN = 'Admin',
    DRIVER = 'Driver',
    CONTROL_CENTER_OPERATOR = 'Control Center Operator',
  }
  
  export enum UserStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
  }
  
  export interface User {
    user_id: string;
    company_id: string;
    username: string;
    password_hash: string;
    email: string;
    phone_number: string;
    role: UserRole;
    status: UserStatus;
    last_login: number; // Unix timestamp
    created_at: number; // Unix timestamp
    updated_at: number; // Unix timestamp
  }