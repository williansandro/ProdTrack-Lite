
import type { SKU, ProductionOrder, Demand } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// Helper to generate unique IDs
export const generateId = async (prefix: string = 'id'): Promise<string> => {
  // Date.now() and Math.random() are fine for server-side ID generation.
  // Making this async to satisfy Next.js build checks when this module is imported by server actions.
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
};

// This function always creates a new store with empty arrays.
// It's used to initialize the store if it doesn't exist or for production.
function createEmptyDataStore(): DataStore {
  return {
    skus: [],
    productionOrders: [],
    demands: [],
  };
}

// Augment the global NodeJS namespace to declare our global DB variable
declare global {
  // eslint-disable-next-line no-var
  var __PCP_TRACKER_DB_INSTANCE__: DataStore | undefined;
}

let db: DataStore;

// Cast globalThis to include our custom property
const g = globalThis as typeof globalThis & { __PCP_TRACKER_DB_INSTANCE__?: DataStore };

if (process.env.NODE_ENV === 'production') {
  // In production, always start with a fresh, empty store.
  db = createEmptyDataStore();
} else {
  // In development, we use a global variable to persist the DataStore instance across HMR updates.
  if (!g.__PCP_TRACKER_DB_INSTANCE__) {
    g.__PCP_TRACKER_DB_INSTANCE__ = createEmptyDataStore();
  }
  db = g.__PCP_TRACKER_DB_INSTANCE__;
}

export { db };

