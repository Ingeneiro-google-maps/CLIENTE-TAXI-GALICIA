import React, { useState, useEffect, useRef } from 'react';
import { SiteConfig, FleetItem } from '../types';
import { X, Save, RotateCcw, Lock, Plus, Trash2, ArrowUp, ArrowDown, Layout, Loader2, Database, AlertTriangle, CheckCircle, Server, RefreshCw } from 'lucide-react';
import { DEFAULT_CONFIG } from '../constants';
import { dbService } from '../services/db';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SiteConfig;
  onSave: (config: SiteConfig) => Promise<void>;
}

const SECTION_LABELS: Record<string, string> = {
  'services': 'Servicios (Cuadrícula)',
  'transfers': 'Traslados Animados (Línea de tiempo)',
  'fleet': 'Flota de Vehículos',
  'reservation': 'Formulario de Reserva y Mapa',
};

type DbStatus = 'idle' | 'connecting' | 'creating' | 'ready' | 'error' | 'saving';

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
  const [formData, setFormData] = useState<SiteConfig>(currentConfig);
  const [dbUrl, setDbUrl] = useState('');
  const [dbStatus, setDbStatus] = useState<DbStatus>('idle');
  const [dbMessage, setDbMessage] = useState('');
  const timeoutRef = useRef<any>(null);

  // Sync internal state if currentConfig changes
  useEffect(() => {
    setFormData(currentConfig);
    
    // Load local DB URL
    const localUrl = localStorage.getItem('taxi_db_url');
    if (localUrl) {
      setDbUrl(localUrl);
      testDbConnection(localUrl);
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDbUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setDbUrl(newVal);
    
    // Debounce connection test
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      testDbConnection(newVal);
    }, 800);
  };

  const testDbConnection = async (url: string) => {
    if (!url) {
      setDbStatus('idle');
      setDbMessage('');
      return;
    }

    setDbStatus('connecting');
    setDbMessage('Conectando con Neon...');

    const result = await dbService.testConnection(url);
    
    if (result.success) {
      setDbStatus('ready');
      setDbMessage('Conexión Perfecta. Base de datos sincronizada.');
    } else {
      setDbStatus('error');
      setDbMessage(result.message);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de restablecer los valores originales?')) {
      setFormData(DEFAULT_CONFIG);
    }
  };

  // Fleet Management Functions
  const handleFleetChange = (index: number, field: keyof FleetItem, value: string) => {
    const newItems = [...(formData.fleetItems || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  const addFleetItem = () => {
    const newItem: FleetItem = {
      id: Date.now().toString(),
      title: 'Nuevo Vehículo',
      description: 'Descripción del vehículo...',
      imageUrl: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
    };
    setFormData(prev => ({ 
      ...prev, 
      fleetItems: [...(prev.fleetItems || []), newItem] 
    }));
  };

  const removeFleetItem = (index: number) => {
    const newItems = [...(formData.fleetItems || [])];
    newItems.splice(index, 1);
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  // Section Ordering Functions
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...(formData.sectionOrder || [])];
    if (direction === 'up') {
      if (index === 0) return;
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else {
      if (index === newOrder.length - 1) return;
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setFormData(prev => ({ ...prev, sectionOrder: newOrder }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbStatus('saving');
    setDbMessage('Modificando y guardando datos...');
    
    // 1. Save DB URL Locally first
    if (dbUrl.trim()) {
      localStorage.setItem('taxi_db_url', dbUrl.trim());
    } else {
      localStorage.removeItem('taxi_db_url');
    }

    // 2. Save Config to DB
    await onSave(formData);
    
    setDbStatus('ready');
    setDbMessage('Guardado correctamente.');
    
    // Short delay then close
    setTimeout(() => {
        onClose();
        // Force reload to apply DB connection if it changed
        const prevUrl = localStorage.getItem('taxi_db_url_prev');
        if (dbUrl !== prevUrl) {
            localStorage.setItem('taxi_db_url_prev', dbUrl);
            window.location.reload();
        }
    }, 500);
  };

  // Helper for DB Status UI
  const getStatusUI = () => {
    switch(dbStatus) {
      case 'idle':
        return { color: 'text-zinc-500', bg: 'bg-zinc-800', icon: <Database size={16} />, text: 'Sin conexión configurada' };
      case 'connecting':
        return { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: <Loader2 size={16} className="animate-spin" />, text: 'Conectando...' };
      case 'creating':
        return { color: 'text-blue-400', bg: 'bg-blue-900/20', icon: <Server size={16} className="animate-pulse" />, text: 'Creando tablas...' };
      case 'ready':
        return { color: 'text-green-400', bg: 'bg-green-900/20', icon: <CheckCircle size={16} />, text: 'Conexión Perfecta' };
      case 'saving':
        return { color: 'text-purple-400', bg: 'bg-purple-900/20', icon: <RefreshCw size={16} className="animate-spin" />, text: 'Modificando...' };
      case 'error':
        return { color: 'text-red-400', bg: 'bg-red-900/20', icon: <AlertTriangle size={16} />, text: 'Error de Conexión' };
    }
  };

  const statusUI = getStatusUI();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-zinc-900 border border-yellow-500 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-yellow-500 rounded-lg text-black">
                <Lock size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Panel de Administración</h2>
                <p className="text-xs text-zinc-400">Edita la información visible del sitio web</p>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="admin-form" onSubmit={handleSubmit} className="space-y-12">
            
            {/* 0. DATABASE CONNECTION (CRITICAL) */}
            <div className={`border p-4 rounded-xl space-y-3 transition-colors ${dbStatus === 'error' ? 'border-red-500/50 bg-red-900/10' : dbStatus === 'ready' ? 'border-green-500/50 bg-green-900/5' : 'border-yellow-500/30 bg-yellow-900/5'}`}>
               <div className="flex justify-between items-center">
                  <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                    <Database size={16} /> Base de Datos (Neon)
                  </h3>
                  {/* Status Badge */}
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${statusUI.bg} ${statusUI.color}`}>
                     {statusUI.icon}
                     <span>{statusUI.text}</span>
                  </div>
               </div>
               
               <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Cadena de Conexión (Connection String)</label>
                  <div className="flex gap-2 relative">
                    <input 
                      type="password" 
                      value={dbUrl} 
                      onChange={handleDbUrlChange}
                      placeholder="postgres://usuario:password@ep-midb.neon.tech/neondb?sslmode=require"
                      className={`w-full bg-black border rounded-lg p-3 text-white focus:outline-none font-mono text-xs pr-10 transition-colors ${dbStatus === 'error' ? 'border-red-500' : dbStatus === 'ready' ? 'border-green-500' : 'border-zinc-700 focus:border-yellow-500'}`}
                    />
                    {dbStatus === 'connecting' && (
                        <div className="absolute right-3 top-3">
                            <Loader2 size={16} className="animate-spin text-yellow-500" />
                        </div>
                    )}
                  </div>
                  
                  {/* Status Message Display */}
                  <div className="flex justify-between items-start">
                    <p className={`text-[10px] font-mono ${statusUI.color}`}>
                        {dbMessage || 'Introduce la URL para conectar.'}
                    </p>
                    <p className="text-[10px] text-zinc-600 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        <span>Debe empezar por <code>postgres://</code></span>
                    </p>
                  </div>
               </div>
            </div>

            {/* 1. Section Ordering */}
            <div className="space-y-4">
              <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Layout size={16} /> Orden de Secciones
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Reordena las secciones de la página principal.</p>
              
              <div className="space-y-2">
                {(formData.sectionOrder || []).map((sectionId, index) => (
                  <div key={sectionId} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800 hover:border-yellow-500/50 transition-colors">
                    <span className="text-sm font-bold text-white">{SECTION_LABELS[sectionId] || sectionId}</span>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded ${index === 0 ? 'text-zinc-700' : 'text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800'}`}
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === (formData.sectionOrder?.length || 0) - 1}
                        className={`p-1 rounded ${index === (formData.sectionOrder?.length || 0) - 1 ? 'text-zinc-700' : 'text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800'}`}
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. General Settings */}
            <div className="space-y-4">
              <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-zinc-800 pb-2">Configuración General</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Título Hero</label>
                  <input 
                    type="text" 
                    name="heroTitle" 
                    value={formData.heroTitle} 
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                 <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Link WhatsApp</label>
                  <input 
                    type="text" 
                    name="whatsappUrl" 
                    value={formData.whatsappUrl} 
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">Subtítulo Hero</label>
                <textarea 
                  name="heroSubtitle" 
                  value={formData.heroSubtitle} 
                  onChange={handleChange}
                  rows={2}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">URL Video de Fondo (MP4)</label>
                <input 
                  type="text" 
                  name="videoUrl" 
                  value={formData.videoUrl} 
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-500">Debe ser un enlace directo a un archivo MP4 (ej: Pexels, Videvo, o hosting propio).</p>
              </div>
            </div>

            {/* 3. Fleet Section (Text) */}
            <div className="space-y-4">
               <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-zinc-800 pb-2">Sección: Flota (Textos)</h3>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Título Flota</label>
                  <input 
                    type="text" 
                    name="fleetTitle" 
                    value={formData.fleetTitle} 
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Descripción Flota</label>
                  <textarea 
                    name="fleetDesc" 
                    value={formData.fleetDesc} 
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none resize-none"
                  />
                </div>
            </div>

            {/* 4. Fleet Items (Dynamic List) */}
            <div className="space-y-4">
               <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                 <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider">Gestión de Vehículos (Imágenes)</h3>
                 <button 
                    type="button" 
                    onClick={addFleetItem}
                    className="flex items-center gap-1 text-xs bg-yellow-500 text-black px-3 py-1 rounded font-bold hover:bg-yellow-400"
                 >
                    <Plus size={14} /> Añadir Vehículo
                 </button>
               </div>
               
               <div className="space-y-6">
                 {formData.fleetItems && formData.fleetItems.map((item, index) => (
                    <div key={item.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative group">
                        <button 
                          type="button"
                          onClick={() => removeFleetItem(index)}
                          className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-900/30 rounded"
                          title="Eliminar"
                        >
                           <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Inputs */}
                           <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500">Nombre del Vehículo</label>
                                <input 
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => handleFleetChange(index, 'title', e.target.value)}
                                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500">Descripción Corta</label>
                                <textarea
                                  value={item.description}
                                  onChange={(e) => handleFleetChange(index, 'description', e.target.value)}
                                  rows={2}
                                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 focus:outline-none resize-none"
                                />
                              </div>
                               <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500">URL de la Imagen</label>
                                <input 
                                  type="text"
                                  value={item.imageUrl}
                                  onChange={(e) => handleFleetChange(index, 'imageUrl', e.target.value)}
                                  placeholder="https://..."
                                  className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono focus:border-yellow-500 focus:outline-none"
                                />
                              </div>
                           </div>

                           {/* Preview */}
                           <div className="flex flex-col items-center justify-center">
                              <div className="w-full h-32 rounded-lg overflow-hidden bg-black border border-zinc-800 mb-2">
                                <img 
                                  src={item.imageUrl} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                />
                              </div>
                              <span className="text-xs text-zinc-500">Vista Previa</span>
                           </div>
                        </div>
                    </div>
                 ))}
                 
                 {(!formData.fleetItems || formData.fleetItems.length === 0) && (
                   <p className="text-center text-zinc-600 italic">No hay vehículos. Añade uno para comenzar.</p>
                 )}
               </div>
            </div>

            {/* 5. Transfers Detail Section */}
             <div className="space-y-4">
              <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-zinc-800 pb-2">Sección: Tipos de Traslados</h3>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Título Principal Sección</label>
                  <input 
                    type="text" 
                    name="transfersTitle" 
                    value={formData.transfersTitle} 
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              
              {/* Transfer 1: Airport */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Traslado 1: Título (Aeropuerto)</label>
                    <input 
                      type="text" 
                      name="transferAirportTitle" 
                      value={formData.transferAirportTitle} 
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Traslado 1: Descripción</label>
                    <textarea 
                      name="transferAirportDesc" 
                      value={formData.transferAirportDesc} 
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none resize-none"
                    />
                 </div>
              </div>

               {/* Transfer 2: Health */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Traslado 2: Título (Salud)</label>
                    <input 
                      type="text" 
                      name="transferHealthTitle" 
                      value={formData.transferHealthTitle} 
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Traslado 2: Descripción</label>
                    <textarea 
                      name="transferHealthDesc" 
                      value={formData.transferHealthDesc} 
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none resize-none"
                    />
                 </div>
              </div>

               {/* Transfer 3: Private */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Traslado 3: Título (Privado)</label>
                    <input 
                      type="text" 
                      name="transferPrivateTitle" 
                      value={formData.transferPrivateTitle} 
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Traslado 3: Descripción</label>
                    <textarea 
                      name="transferPrivateDesc" 
                      value={formData.transferPrivateDesc} 
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none resize-none"
                    />
                 </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 rounded-b-2xl flex justify-between items-center">
          <button 
            type="button" 
            onClick={handleReset}
            className="flex items-center gap-2 text-red-500 hover:text-red-400 font-bold text-sm px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <RotateCcw size={16} /> Restaurar Defaults
          </button>
          
          <button 
            type="submit" 
            form="admin-form"
            disabled={dbStatus === 'saving' || dbStatus === 'connecting'}
            className={`flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 ${dbStatus === 'saving' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {dbStatus === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {dbStatus === 'saving' ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;