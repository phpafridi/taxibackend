// types/maintenance.ts
export interface MaintenanceDocument {
  id: number;
  filename: string;
  filetype: string;
  url: string;
  uploadedAt: string;
  fileSize?: number;
}

export interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  car: {
    id: number;
    registration: string;
    model: string;
    make: string;
    year: number;
  };
  driverprofile: {
    user_driverprofile_userIdTouser: {
      name: string;
      email: string;
      phone: string;
      avatar?: string;
    };
  };
  documents: MaintenanceDocument[];
}

export interface MaintenanceFilters {
  search: string;
  priority: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface MaintenanceStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}