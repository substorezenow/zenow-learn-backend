import { dbManager } from './utils/databaseManager';

export async function connectCockroach(): Promise<void> {
  try {
    await dbManager.connect();
    console.log('✅ CockroachDB connected successfully');
  } catch (error) {
    console.error('❌ CockroachDB connection error:', error);
    throw error;
  }
}

// Legacy compatibility - lazy pool export
export const pool = {
  query: async (text: string, params?: any[]) => {
    return await dbManager.query(text, params);
  },
  connect: async () => {
    return await dbManager.connect();
  },
  end: async () => {
    return await dbManager.close();
  }
};
