import { neon } from '@neondatabase/serverless';
import { SiteConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';

// URL proporcionada por el usuario (HARDCODED BACKUP)
const PROVIDED_DB_URL = "postgresql://neondb_owner:npg_6fHhjT9mnJPL@ep-withered-sun-ahefjqm9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Helper to safely get env var
export const getDbUrl = () => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('taxi_db_url');
    if (localUrl && localUrl.trim().startsWith('postgres')) {
      return localUrl;
    }
  }
  return PROVIDED_DB_URL;
};

export const dbService = {
  /**
   * Tests the connection
   */
  testConnection: async (connectionString: string): Promise<{ success: boolean; message: string; stage: 'connecting' | 'creating' | 'ready' | 'error' }> => {
    if (!connectionString || !connectionString.startsWith('postgres')) {
      return { success: false, message: 'URL inválida', stage: 'error' };
    }

    try {
      const sql = neon(connectionString);
      // Simple ping
      await sql`SELECT 1`;
      
      // Try creating table if not exists (Transactionless compatible)
      try {
          await sql`CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY, config JSONB)`;
      } catch (e) {
          console.warn("Table create warning:", e);
      }

      return { success: true, message: 'Conexión Exitosa', stage: 'ready' };
    } catch (e: any) {
      return { success: false, message: `Error: ${e.message}`, stage: 'error' };
    }
  },

  /**
   * Fetches config
   */
  getConfig: async (): Promise<SiteConfig> => {
    try {
      const url = getDbUrl();
      const sql = neon(url);
      
      const response = await sql`SELECT config FROM app_settings WHERE id = 1`;
      
      if (response && response.length > 0) {
          const loadedConfig = response[0].config;
          // Merge with defaults to ensure all fields exist
          return { ...DEFAULT_CONFIG, ...loadedConfig };
      }
      
      return DEFAULT_CONFIG;
    } catch (error) {
      console.error('DB Load Error (using defaults):', error);
      return DEFAULT_CONFIG;
    }
  },

  /**
   * Saves config
   */
  saveConfig: async (newConfig: SiteConfig): Promise<boolean> => {
    try {
      const url = getDbUrl();
      const sql = neon(url);
      const configJson = JSON.stringify(newConfig);
      
      // SIZE CHECK: 4MB Limit (Safe for Neon HTTP)
      const sizeBytes = new Blob([configJson]).size;
      if (sizeBytes > 4 * 1024 * 1024) {
          alert(`ERROR CRÍTICO: Los datos pesan ${(sizeBytes/1024/1024).toFixed(2)}MB. El límite es 4MB.\n\nProbablemente tienes un video cargado como archivo. Bórralo y usa un enlace.`);
          return false;
      }

      // Ensure table exists
      await sql`CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY, config JSONB)`;

      // Upsert
      await sql`
        INSERT INTO app_settings (id, config)
        VALUES (1, ${configJson}::jsonb)
        ON CONFLICT (id) 
        DO UPDATE SET config = ${configJson}::jsonb
      `;
      
      return true;
    } catch (error: any) {
      console.error('DB Save Error:', error);
      alert(`Error al guardar en base de datos:\n${error.message}`);
      return false;
    }
  }
};