import { neon } from '@neondatabase/serverless';
import { SiteConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';

// Helper to safely get env var without crashing
// PRIORITY: 
// 1. LocalStorage (User entered in Admin Panel)
// 2. Environment Variable (.env)
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
    if (typeof meta !== 'undefined' && meta.env) {
      return meta.env.VITE_DATABASE_URL;
    }
  } catch (e) {
    console.warn('Could not access environment variables');
  }
  return '';
};

// We DO NOT initialize the client at the top level anymore to prevent crashes
// if the URL is missing or empty.

export const dbService = {
  /**
   * Fetches the site configuration from the database.
   * If no config exists or error occurs, returns the DEFAULT_CONFIG.
   */
  getConfig: async (): Promise<SiteConfig> => {
    try {
      const url = getDbUrl();
      
      // CRITICAL FIX: If URL is missing/empty, return defaults immediately.
      // Do not attempt to create a neon client with an empty string.
      if (!url || typeof url !== 'string' || url.trim() === '') {
        console.log('Database URL not configured, using local defaults.');
        return DEFAULT_CONFIG;
      }

      const sql = neon(url);
      
      // We assume row ID 1 holds the active config
      const response = await sql`SELECT config FROM app_settings WHERE id = 1`;
      
      if (response && response.length > 0 && response[0].config && Object.keys(response[0].config).length > 0) {
        // Merge DB config with defaults to ensure new fields are present
        return { ...DEFAULT_CONFIG, ...response[0].config };
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
      
      // Upsert logic: Update ID 1, if not exists (unlikely due to setup), insert it.
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