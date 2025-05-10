
import type { SKU, ProductionOrder, Demand, ProductionOrderStatus } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// In-memory store
export const db: DataStore = {
  skus: [
    { id: 'sku-1', code: 'PNL-001', description: 'Painel Solar Standard X', createdAt: new Date(2023, 0, 10), updatedAt: new Date(2023, 0, 10) },
    { id: 'sku-2', code: 'WIDGET-A', description: 'Widget Avançado Tipo A', createdAt: new Date(2023, 1, 15), updatedAt: new Date(2023, 1, 15) },
    { id: 'sku-3', code: 'BRKT-SML', description: 'Suporte Pequeno Universal', createdAt: new Date(2023, 2, 20), updatedAt: new Date(2023, 2, 20) },
    { id: 'sku-4', code: 'INV-MICRO', description: 'Microinversor 500W', createdAt: new Date(2023, 3, 1), updatedAt: new Date(2023, 3, 1) },
    { id: 'sku-5', code: 'CABLE-10M', description: 'Cabo Solar 10 Metros', createdAt: new Date(2023, 4, 5), updatedAt: new Date(2023, 4, 5) },
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
      deliveredQuantity: 95, // Example: 95 units delivered
      secondsPerUnit: ((new Date('2024-07-10T17:30:00Z').getTime() - new Date('2024-07-10T09:00:00Z').getTime()) / 1000) / 95, // Calculated
      notes: "Lote inicial, verificar qualidade.",
      createdAt: new Date('2024-07-09T08:00:00Z'), 
      updatedAt: new Date('2024-07-10T17:30:00Z')
    },
    { 
      id: 'po-2', 
      skuId: 'sku-2', 
      skuCode: 'WIDGET-A', 
      quantity: 50, 
      status: 'in_progress' as ProductionOrderStatus, 
      startTime: new Date('2024-07-15T10:00:00Z').getTime(),
      notes: "Cliente aguardando com urgência.", 
      createdAt: new Date('2024-07-14T14:00:00Z'), 
      updatedAt: new Date('2024-07-15T10:00:00Z') 
    },
    { 
      id: 'po-3', 
      skuId: 'sku-1', 
      skuCode: 'PNL-001', 
      quantity: 200, 
      status: 'open' as ProductionOrderStatus, 
      notes: "Produzir para estoque.",
      createdAt: new Date('2024-07-18T11:00:00Z'), 
      updatedAt: new Date('2024-07-18T11:00:00Z')
    },
     { 
      id: 'po-4', 
      skuId: 'sku-3', 
      skuCode: 'BRKT-SML', 
      quantity: 500, 
      status: 'open' as ProductionOrderStatus, 
      notes: "",
      createdAt: new Date('2024-07-20T09:30:00Z'), 
      updatedAt: new Date('2024-07-20T09:30:00Z')
    },
    { 
      id: 'po-5', 
      skuId: 'sku-4', 
      skuCode: 'INV-MICRO', 
      quantity: 75, 
      status: 'cancelled' as ProductionOrderStatus, 
      notes: "Pedido do cliente cancelado.",
      createdAt: new Date('2024-07-01T10:00:00Z'), 
      updatedAt: new Date('2024-07-05T15:00:00Z') 
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
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;


