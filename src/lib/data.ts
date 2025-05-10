import type { SKU, ProductionOrder, Demand, ProductionOrderStatus } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// In-memory store
export const db: DataStore = {
  skus: [
    { id: 'sku-1', code: 'PNL-001', description: 'Standard Panel X', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sku-2', code: 'WIDGET-A', description: 'Advanced Widget Type A', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sku-3', code: 'BRKT-SML', description: 'Small Bracket Universal', createdAt: new Date(), updatedAt: new Date() },
  ],
  productionOrders: [
    { 
      id: 'po-1', 
      skuId: 'sku-1', 
      skuCode: 'PNL-001', 
      quantity: 100, 
      status: 'completed' as ProductionOrderStatus, 
      startTime: new Date('2024-07-10T09:00:00Z').getTime(), 
      endTime: new Date('2024-07-10T17:30:00Z').getTime(), 
      totalProductionTime: (new Date('2024-07-10T17:30:00Z').getTime() - new Date('2024-07-10T09:00:00Z').getTime()), 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
    { 
      id: 'po-2', 
      skuId: 'sku-2', 
      skuCode: 'WIDGET-A', 
      quantity: 50, 
      status: 'in_progress' as ProductionOrderStatus, 
      startTime: new Date('2024-07-15T10:00:00Z').getTime(), 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
    { 
      id: 'po-3', 
      skuId: 'sku-1', 
      skuCode: 'PNL-001', 
      quantity: 200, 
      status: 'open' as ProductionOrderStatus, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
  ],
  demands: [
    { 
      id: 'demand-1', 
      skuId: 'sku-1', 
      skuCode: 'PNL-001', 
      monthYear: '2024-07', 
      targetQuantity: 250, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
    { 
      id: 'demand-2', 
      skuId: 'sku-2', 
      skuCode: 'WIDGET-A', 
      monthYear: '2024-07', 
      targetQuantity: 75, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
    { 
      id: 'demand-3', 
      skuId: 'sku-1', 
      skuCode: 'PNL-001', 
      monthYear: '2024-08', 
      targetQuantity: 300, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
  ],
};

// Helper to generate unique IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
