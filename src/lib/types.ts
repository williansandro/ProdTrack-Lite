
export interface SKU {
  id: string;
  code: string;
  description: string;
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

// Helper type for form data, typically without id, createdAt, updatedAt
export type SkuFormData = Omit<SKU, 'id' | 'createdAt' | 'updatedAt'>;
export type ProductionOrderFormData = Omit<ProductionOrder, 'id' | 'skuCode' | 'status' | 'startTime' | 'endTime' | 'totalProductionTime' | 'createdAt' | 'updatedAt'> & { quantity: string }; // quantity as string from form
export type DemandFormData = Omit<Demand, 'id' | 'skuCode' | 'createdAt' | 'updatedAt'> & { targetQuantity: string }; // targetQuantity as string from form
