
import type { SKU, ProductionOrder, Demand } from './types';

interface DataStore {
  skus: SKU[];
  productionOrders: ProductionOrder[];
  demands: Demand[];
}

// Helper to generate unique IDs
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

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
  // For actual persistence in production, a real database solution (e.g., Firebase Firestore, Supabase, PostgreSQL) should be used.
  db = createEmptyDataStore();
} else {
  // In development, we use a global variable to persist the DataStore instance across HMR updates.
  // This ensures that data entered during a dev session is not lost on file changes/reloads.
  if (!g.__PCP_TRACKER_DB_INSTANCE__) {
    // If the global instance doesn't exist (e.g., on first server start),
    // initialize it with an empty store.
    // console.log('Development: Initializing new empty in-memory database for this session.');
    g.__PCP_TRACKER_DB_INSTANCE__ = createEmptyDataStore();
  } else {
    // If it exists, re-use it.
    // console.log('Development: Re-using existing in-memory database for this session.');
  }
  // Assign the (potentially existing) global instance to our exported 'db'.
  db = g.__PCP_TRACKER_DB_INSTANCE__;
}

export { db };
