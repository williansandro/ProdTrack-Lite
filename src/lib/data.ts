
import type { SKU, ProductionOrder, Demand, ProductionOrderStatus } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// Helper to generate unique IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

function initializeDb(): DataStore {
  return {
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
      { 
        id: 'po-6', 
        skuId: 'sku-1', // For PNL-001
        skuCode: 'PNL-001', 
        quantity: 50, 
        status: 'completed' as ProductionOrderStatus, 
        startTime: new Date('2024-07-01T09:00:00Z').getTime(), 
        endTime: new Date('2024-07-01T12:00:00Z').getTime(), 
        totalProductionTime: (new Date('2024-07-01T12:00:00Z').getTime() - new Date('2024-07-01T09:00:00Z').getTime()), 
        deliveredQuantity: 50,
        secondsPerUnit: ((new Date('2024-07-01T12:00:00Z').getTime() - new Date('2024-07-01T09:00:00Z').getTime()) / 1000) / 50,
        notes: "Produção adicional para Julho.",
        createdAt: new Date('2024-06-30T08:00:00Z'), 
        updatedAt: new Date('2024-07-01T12:00:00Z')
      },
      { 
        id: 'po-7', 
        skuId: 'sku-2', // For WIDGET-A
        skuCode: 'WIDGET-A', 
        quantity: 30, 
        status: 'completed' as ProductionOrderStatus, 
        startTime: new Date('2024-07-05T09:00:00Z').getTime(), 
        endTime: new Date('2024-07-05T11:00:00Z').getTime(), 
        totalProductionTime: (new Date('2024-07-05T11:00:00Z').getTime() - new Date('2024-07-05T09:00:00Z').getTime()), 
        deliveredQuantity: 25,
        secondsPerUnit: ((new Date('2024-07-05T11:00:00Z').getTime() - new Date('2024-07-05T09:00:00Z').getTime()) / 1000) / 25,
        notes: "Entrega parcial.",
        createdAt: new Date('2024-07-04T08:00:00Z'), 
        updatedAt: new Date('2024-07-05T11:00:00Z')
      },
    ],
    demands: [
      { 
        id: 'demand-1', 
        skuId: 'sku-1', 
        skuCode: 'PNL-001', 
        monthYear: '2024-07', // July 2024
        targetQuantity: 250, 
        createdAt: new Date(2024, 5, 1), // June 1, 2024
        updatedAt: new Date(2024, 5, 1) 
      },
      { 
        id: 'demand-2', 
        skuId: 'sku-2', 
        skuCode: 'WIDGET-A', 
        monthYear: '2024-07', // July 2024
        targetQuantity: 75, 
        createdAt: new Date(2024, 5, 5), // June 5, 2024
        updatedAt: new Date(2024, 5, 5) 
      },
      { 
        id: 'demand-3', 
        skuId: 'sku-1', 
        skuCode: 'PNL-001', 
        monthYear: '2024-08', // August 2024
        targetQuantity: 300, 
        createdAt: new Date(2024, 6, 1), // July 1, 2024
        updatedAt: new Date(2024, 6, 1) 
      },
       { 
        id: 'demand-4', 
        skuId: 'sku-3', 
        skuCode: 'BRKT-SML', 
        monthYear: '2024-08', // August 2024
        targetQuantity: 1000, 
        createdAt: new Date(2024, 6, 10), // July 10, 2024
        updatedAt: new Date(2024, 6, 10) 
      },
    ],
  };
}

// Augment the global NodeJS namespace if in a Node.js environment
declare global {
  // eslint-disable-next-line no-var
  var __db__: DataStore | undefined;
}

let db: DataStore;

if (process.env.NODE_ENV === 'production') {
  db = initializeDb();
} else {
  // In development, ensure db is reset on each module evaluation (e.g. HMR, server restart)
  // by always re-initializing it. This prevents data from persisting across code changes during development.
  global.__db__ = initializeDb();
  db = global.__db__;
}

export { db };
