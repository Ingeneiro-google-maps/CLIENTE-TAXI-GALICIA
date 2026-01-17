import { neon } from '@neondatabase/serverless';
import { SiteConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';

// URL proporcionada por el usuario
const PROVIDED_DB_URL = "postgresql://neondb_owner:npg_6fHhjT9mnJPL@ep-withered-sun-ahefjqm9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Helper to safely get env var without crashing
// PRIORITY: 
// 1. LocalStorage (User entered in Admin Panel)
// 2. Environment Variable (.env)
// 3. Provided Default (Hardcoded)
export const getDbUrl = () => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('taxi_db_url');
    if (localUrl && localUrl.trim() !== '') {
      return localUrl;
    }
  }

  try {
    // Check if import.meta.env exists (Vite)
    const meta = import.meta as any;
    if (typeof meta !== 'undefined' && meta.env && meta.env.VITE_DATABASE_URL) {
      return meta.env.VITE_DATABASE_URL;
    }
  } catch (e) {
    console.warn('Could not access environment variables');
  }
  
  // Return the user provided URL if nothing else is set
  return PROVIDED_DB_URL;
};

export const dbService = {
  /**
   * Tests the connection and initializes the table if needed.
   */
  testConnection: async (connectionString: string): Promise<{ success: boolean; message: string; stage: 'connecting' | 'creating' | 'ready' | 'error' }> => {
    if (!connectionString || connectionString.trim() === '') {
      return { success: false, message: 'URL no proporcionada', stage: 'error' };
    }

    const sql = neon(connectionString);
    
    try {
      // 1. Test basic connectivity (Connecting phase)
      await sql`SELECT 1`;
    } catch (e: any) {
      return { success: false, message: `No se pudo conectar: ${e.message}`, stage: 'error' };
    }

    try {
      // 2. Ensure table exists (Creating phase)
      // We check if table exists first to report status correctly if needed, 
      // but simpler is just to run CREATE IF NOT EXISTS
      await sql`CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY, config JSONB)`;
      
      // Verify access by trying to read (even if empty)
      await sql`SELECT id FROM app_settings LIMIT 1`;

      return { success: true, message: 'Conexión Perfecta. Base de datos sincronizada.', stage: 'ready' };
    } catch (e: any) {
       return { success: false, message: `Error al verificar tablas: ${e.message}`, stage: 'error' };
    }
  },

  /**
   * Fetches the site configuration from the database.
   * If no config exists or error occurs, returns the DEFAULT_CONFIG.
   */
  getConfig: async (): Promise<SiteConfig> => {
    try {
      const url = getDbUrl();
      
      if (!url || typeof url !== 'string' || url.trim() === '') {
        console.log('Database URL not configured, using local defaults.');
        return DEFAULT_CONFIG;
      }

      const sql = neon(url);
      
      // We assume row ID 1 holds the active config
      // Wrap in try/catch specifically for the query in case table doesn't exist yet
      try {
        const response = await sql`SELECT config FROM app_settings WHERE id = 1`;
        if (response && response.length > 0 && response[0].config && Object.keys(response[0].config).length > 0) {
          return { ...DEFAULT_CONFIG, ...response[0].config };
        }
      } catch (e) {
        console.log('Table might not exist yet or empty, returning defaults');
      }
      
      return DEFAULT_CONFIG;
    } catch (error) {
      console.error('Error fetching config from Neon (using defaults):', error);
      return DEFAULT_CONFIG;
    }
  },

  /**
   * Saves the site configuration to the database.
   */
  saveConfig: async (newConfig: SiteConfig): Promise<boolean> => {
    try {
      const url = getDbUrl();

      if (!url || typeof url !== 'string' || url.trim() === '') {
        alert('AVISO: No estás conectado a la Base de Datos.\n\nVe al Panel de Admin > Configuración General e introduce la "Cadena de Conexión" de Neon (empieza por postgres://).');
        return true; // Return true so UI updates optimistically
      }

      const sql = neon(url);
      const configJson = JSON.stringify(newConfig);
      
      // Ensure table exists before saving (just in case)
      await sql`CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY, config JSONB)`;

      // Upsert logic
      await sql`
        INSERT INTO app_settings (id, config)
        VALUES (1, ${configJson}::jsonb)
        ON CONFLICT (id) 
        DO UPDATE SET config = ${configJson}::jsonb
      `;
      
      return true;
    } catch (error) {
      console.error('Error saving config to Neon:', error);
      alert('Error al guardar en la base de datos Neon. Comprueba que la URL de conexión sea correcta.');
      return false;
    }
  }
};