
import type { SKU, ProductionOrder, Demand, ProductionOrderStatus } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// Helper to generate unique IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

// Initialize with empty arrays to ensure no persistent mock data
const initialSkus: SKU[] = [];
const initialProductionOrders: ProductionOrder[] = [];
const initialDemands: Demand[] = [];


function createInitialDataStore(): DataStore {
  // Deep copy initial data to prevent modification of the original arrays
  // Ensures that if these arrays were to have data for some reason, they are freshly copied.
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
  // In production, always start with a clean, empty store.
  // If persistence is needed in production, a real database should be used.
  db = createInitialDataStore();
} else {
  // In development, we use a global variable to persist data across HMR updates.
  if (!g.__db__ || !g.__data_initialized__) {
    // console.log('Development: Initializing in-memory database (empty).');
    g.__db__ = createInitialDataStore();
    g.__data_initialized__ = true; // Mark as initialized to prevent re-seeding with empty data on every HMR
  } else {
    // console.log('Development: Re-using existing in-memory database.');
  }
  db = g.__db__;
}

export { db };

