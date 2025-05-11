
export interface SKU {
  id: string;
  code: string;
  description: string;
  unitOfMeasure: string; // Added unit of measure
  createdAt: Date;
  updatedAt: Date;
}

export type ProductionOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface ProductionOrder {
  id: string;
  skuId: string;
  skuCode: string; // For display convenience, denormalized
  quantity: number;
  status: ProductionOrderStatus;
  startTime?: number; // Timestamp (Date.now())
  endTime?: number; // Timestamp (Date.now())
  totalProductionTime?: number; // in milliseconds
  deliveredQuantity?: number; // Actual quantity delivered upon completion
  secondsPerUnit?: number; // Seconds per unit, calculated on completion
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Demand {
  id: string;
  skuId: string;
  skuCode: string; // For display convenience
  monthYear: string; // Format: "YYYY-MM", e.g., "2024-08"
  targetQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemandWithProgress extends Demand {
  producedQuantity: number;
  progressPercentage: number;
}

// Helper type for form data, typically without id, createdAt, updatedAt
export type SkuFormData = Omit<SKU, 'id' | 'createdAt' | 'updatedAt'>;

// For ProductionOrderForm - quantity will be string from input, notes is optional
export type ProductionOrderFormData = {
  skuId: string;
  quantity: string; // Will be coerced to number
  notes?: string;
};

export type DemandFormData = {
  skuId: string;
  monthYear: string; // Format: "YYYY-MM"
  targetQuantity: string; // Will be coerced to number
};

export interface PerformanceSkuData {
  id: string;
  skuCode: string;
  description: string;
  totalProduced: number;
  percentageOfTotal: number;
  cumulativePercentage: number;
  abcCategory: 'A' | 'B' | 'C';
}
