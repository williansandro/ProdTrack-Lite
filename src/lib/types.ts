export interface SKU {
  id: string;
  code: string;
  description: string;
  unitOfMeasure: string;
  createdAt: Date; // Manter como Date no TypeScript, converter para/de Timestamp do Firestore nas actions
  updatedAt: Date; // Manter como Date no TypeScript
}

export type ProductionOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface ProductionOrder {
  id: string;
  skuId: string;
  skuCode: string; // Denormalizado para exibição
  quantity: number;
  status: ProductionOrderStatus;
  startTime?: number | null; // Milliseconds from epoch or null
  endTime?: number | null;   // Milliseconds from epoch or null
  totalProductionTime?: number | null; // in milliseconds or null
  deliveredQuantity?: number | null;
  secondsPerUnit?: number | null;
  notes?: string;
  createdAt: Date; // Manter como Date
  updatedAt: Date; // Manter como Date
}

export interface Demand {
  id: string;
  skuId: string;
  skuCode: string; // Denormalizado
  monthYear: string; // Format: "YYYY-MM"
  targetQuantity: number;
  createdAt: Date; // Manter como Date
  updatedAt: Date; // Manter como Date
}

export interface DemandWithProgress extends Demand {
  producedQuantity: number;
  progressPercentage: number;
}

export type SkuFormData = Omit<SKU, 'id' | 'createdAt' | 'updatedAt'>;

export type ProductionOrderFormData = {
  skuId: string;
  quantity: string; 
  notes?: string;
};

export type DemandFormData = {
  skuId: string;
  monthYear: string; 
  targetQuantity: string; 
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

// Helper for data.ts generateIdType, not directly used but shows intent
export interface generateIdType {
    id: string;
}