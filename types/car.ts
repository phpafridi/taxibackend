// types/car.ts
export interface Car {
  id: number;
  registration: string;
  model: string;
  make: string;
  year: number | null;
  color: string | null;
  avatar: string | null;
  purchasePrice: number;
  purchaseDate: string | null;
  currentValue: number | null;
  isActive: boolean;
  status: string;
  driverProfileId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  HIRE : boolean;
  INSURANCE_C : boolean;
  // Relations
  driverprofile?: {
    id: number;
    userId: number;
    user: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
      avatar: string | null;
      isActive: boolean;
    };
  } | null;
  
  agreement: Array<{
    id: number;
    type: string;
    title: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    signedAt: string | null;
    driver: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
  
  document: Array<{
    id: number;
    type: string;
    name: string;
    fileName: string;
    fileUrl: string;
    createdAt: string;
  }>;
  
  insurance: Array<{
    id: number;
    provider: string;
    policyNo: string | null;
    startDate: string;
    endDate: string;
    yearlyCost: number | null;
    monthlyCharge: number | null;
    driver: {
      id: number;
      name: string;
    } | null;
  }>;
  
  weeklypayment: Array<{
    id: number;
    amount: number;
    weekStart: string;
    weekEnd: string;
    status: string;
    driver: {
      id: number;
      name: string;
    } | null;
  }>;
  
  maintenancerequest: Array<{
    id: number;
    title: string;
    description: string;
    amount: number;
    status: string;
    createdAt: string;
    driver: {
      id: number;
      name: string;
    } | null;
  }>;
  
  statistics: {
    totalAgreements: number;
    activeAgreements: number;
    totalPayments: number;
    totalMaintenance: number;
    totalInsurance: number;
  };
}

export interface CarFormData {
  registration: string;
  model: string;
  make: string;
  year: number | null;
  color: string | null;
  purchasePrice: number;
  purchaseDate: string | null;
  currentValue: number | null;
  isActive: boolean;
  status: string;
  driverProfileId: number | null;
}

export interface CarStatistics {
  totalCars: number;
  availableCars: number;
  rentedCars: number;
  maintenanceCars: number;
  totalRevenue: number;
}