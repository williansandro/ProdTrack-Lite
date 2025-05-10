
import type { SKU, ProductionOrder, Demand, ProductionOrderStatus } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// Helper to generate unique IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

const initialSkus: SKU[] = [
  { id: 'sku-1', code: 'PNL-001', description: 'Painel Solar Standard X', unitOfMeasure: 'UN', createdAt: new Date(2023, 0, 10), updatedAt: new Date(2023, 0, 10) },
  { id: 'sku-2', code: 'WIDGET-A', description: 'Widget Avançado Tipo A', unitOfMeasure: 'PC', createdAt: new Date(2023, 1, 15), updatedAt: new Date(2023, 1, 15) },
  { id: 'sku-3', code: 'BRKT-SML', description: 'Suporte Pequeno Universal', unitOfMeasure: 'KG', createdAt: new Date(2023, 2, 20), updatedAt: new Date(2023, 2, 20) },
  { id: 'sku-4', code: 'INV-MICRO', description: 'Microinversor 500W', unitOfMeasure: 'UN', createdAt: new Date(2023, 3, 1), updatedAt: new Date(2023, 3, 1) },
  { id: 'sku-5', code: 'CABLE-10M', description: 'Cabo Solar 10 Metros', unitOfMeasure: 'M', createdAt: new Date(2023, 4, 5), updatedAt: new Date(2023, 4, 5) },
];

const initialProductionOrders: ProductionOrder[] = [
  { 
    id: 'po-1', 
    skuId: 'sku-1', 
    skuCode: 'PNL-001', 
    quantity: 100, 
    status: 'completed' as ProductionOrderStatus, 
    startTime: new Date('2024-07-10T09:00:00Z').getTime(), 
    endTime: new Date('2024-07-10T17:30:00Z').getTime(), 
    totalProductionTime: (new Date('2024-07-10T17:30:00Z').getTime() - new Date('2024-07-10T09:00:00Z').getTime()), 
    deliveredQuantity: 95,
    secondsPerUnit: ((new Date('2024-07-10T17:30:00Z').getTime() - new Date('2024-07-10T09:00:00Z').getTime()) / 1000) / 95,
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
    skuId: 'sku-1', 
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
    skuId: 'sku-2', 
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
];

const initialDemands: Demand[] = [
  { 
    id: 'demand-1', 
    skuId: 'sku-1', 
    skuCode: 'PNL-001', 
    monthYear: '2024-07', 
    targetQuantity: 250, 
    createdAt: new Date(2024, 5, 1), 
    updatedAt: new Date(2024, 5, 1) 
  },
  { 
    id: 'demand-2', 
    skuId: 'sku-2', 
    skuCode: 'WIDGET-A', 
    monthYear: '2024-07', 
    targetQuantity: 75, 
    createdAt: new Date(2024, 5, 5), 
    updatedAt: new Date(2024, 5, 5) 
  },
  { 
    id: 'demand-3', 
    skuId: 'sku-1', 
    skuCode: 'PNL-001', 
    monthYear: '2024-08', 
    targetQuantity: 300, 
    createdAt: new Date(2024, 6, 1), 
    updatedAt: new Date(2024, 6, 1) 
  },
   { 
    id: 'demand-4', 
    skuId: 'sku-3', 
    skuCode: 'BRKT-SML', 
    monthYear: '2024-08', 
    targetQuantity: 1000, 
    createdAt: new Date(2024, 6, 10), 
    updatedAt: new Date(2024, 6, 10) 
  },
];


function createInitialDataStore(): DataStore {
  // Deep copy initial data to prevent modification of the original arrays
  return {
    skus: JSON.parse(JSON.stringify(initialSkus)),
    productionOrders: JSON.parse(JSON.stringify(initialProductionOrders)),
    demands: JSON.parse(JSON.stringify(initialDemands)),
  };
}

// Augment the global NodeJS namespace if in a Node.js environment
declare global {
  // eslint-disable-next-line no-var
  var __db__: DataStore | undefined;
  // eslint-disable-next-line no-var
  var __data_initialized__: boolean | undefined;
}

let db: DataStore;

const g = globalThis as typeof globalThis & { __db__?: DataStore, __data_initialized__?: boolean };

if (process.env.NODE_ENV === 'production') {
  db = createInitialDataStore();
} else {
  if (!g.__db__ || !g.__data_initialized__) {
    // console.log('Development: Initializing in-memory database with seed data.');
    g.__db__ = createInitialDataStore();
    g.__data_initialized__ = true;
  } else {
    // console.log('Development: Re-using existing in-memory database.');
  }
  db = g.__db__;
}

export { db };
