import React, { useState, useEffect, useRef } from 'react';
import { SiteConfig, FleetItem } from '../types';
import { X, Save, RotateCcw, Lock, Plus, Trash2, ArrowUp, ArrowDown, Layout, Loader2, Database, AlertTriangle, CheckCircle, Server, RefreshCw, Smartphone, Mail, Video, Upload, FileVideo, MessageCircle, PlaySquare, AlertOctagon, Mic, Type } from 'lucide-react';
import { DEFAULT_CONFIG } from '../constants';
import { dbService, getDbUrl } from '../services/db';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SiteConfig;
  onSave: (config: SiteConfig) => Promise<boolean>;
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
  const [configSize, setConfigSize] = useState(0);
  const timeoutRef = useRef<any>(null);

  // Sync internal state if currentConfig changes
  useEffect(() => {
    if (isOpen) {
        setFormData(currentConfig);
        
        // Calculate initial size
        const size = new Blob([JSON.stringify(currentConfig)]).size;
        setConfigSize(size);

        // Load active DB URL
        const activeUrl = getDbUrl();
        setDbUrl(activeUrl);

        if (activeUrl) {
            testDbConnection(activeUrl);
        }
    }
  }, [currentConfig, isOpen]);

  // Monitor Config Size
  useEffect(() => {
     const size = new Blob([JSON.stringify(formData)]).size;
     setConfigSize(size);
  }, [formData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, checked } = e.target;
     setFormData(prev => ({ ...prev, [name]: checked }));
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
    setDbMessage('Verificando conexión...');

    const result = await dbService.testConnection(url);
    
    if (result.success) {
      setDbStatus('ready');
      setDbMessage(result.message);
    } else {
      setDbStatus('error');
      setDbMessage(result.message);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de restablecer los valores originales? Esto borrará tus cambios no guardados.')) {
      setFormData(DEFAULT_CONFIG);
    }
  };

  // Generalized upload handler for any field
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof SiteConfig) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // LIMIT CHECK: Reduced to 1.5MB to prevent DB crashes
    const MAX_SIZE_MB = 1.5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { 
       alert(`ERROR: El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB).\n\nLímite: ${MAX_SIZE_MB}MB.\n\nIMPORTANTE: Las bases de datos no sirven para guardar videos. Sube tu video a YouTube, Vimeo o un hosting y pega el ENLACE (URL) en la casilla.`);
       return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData(prev => ({ ...prev, [fieldName]: result }));
    };
    reader.onerror = () => alert("Error al leer el archivo.");
    reader.readAsDataURL(file);
  };

  const clearVideo = (fieldName: keyof SiteConfig) => {
      setFormData(prev => ({ ...prev, [fieldName]: '' }));
  };

  // Fleet Management
  const handleFleetChange = (index: number, field: keyof FleetItem, value: string) => {
    const newItems = [...(formData.fleetItems || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  const addFleetItem = () => {
    const newItem: FleetItem = {
      id: Date.now().toString(),
      title: 'Nuevo Vehículo',
      description: 'Descripción...',
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

  // Section Ordering
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
    
    // Final Safety Check
    const sizeMB = configSize / (1024 * 1024);
    if (sizeMB > 4) {
        alert(`¡ALTO! La configuración pesa ${sizeMB.toFixed(2)}MB. Es demasiado para guardar.\n\nSeguramente tienes videos cargados como archivo en lugar de URL.\n\nBorra los videos cargados y usa enlaces.`);
        return;
    }

    setDbStatus('saving');
    setDbMessage('Guardando...');
    
    // Save DB URL Locally
    if (dbUrl.trim()) {
      localStorage.setItem('taxi_db_url', dbUrl.trim());
    } else {
      localStorage.removeItem('taxi_db_url');
    }

    // Save Config
    const success = await onSave(formData);
    
    if (success) {
        setDbStatus('ready');
        setDbMessage('¡Guardado correctamente!');
        setTimeout(() => {
            onClose();
            window.location.reload(); 
        }, 1000);
    } else {
        setDbStatus('error');
        setDbMessage('Error al guardar. Revisa el tamaño.');
    }
  };

  // Status UI Helper
  const getStatusUI = () => {
    switch(dbStatus) {
      case 'idle': return { color: 'text-zinc-500', bg: 'bg-zinc-800', icon: <Database size={16} />, text: 'Desconectado' };
      case 'connecting': return { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: <Loader2 size={16} className="animate-spin" />, text: 'Conectando...' };
      case 'creating': return { color: 'text-blue-400', bg: 'bg-blue-900/20', icon: <Server size={16} className="animate-pulse" />, text: 'Configurando...' };
      case 'ready': return { color: 'text-green-400', bg: 'bg-green-900/20', icon: <CheckCircle size={16} />, text: 'Conectado' };
      case 'saving': return { color: 'text-purple-400', bg: 'bg-purple-900/20', icon: <RefreshCw size={16} className="animate-spin" />, text: 'Guardando...' };
      case 'error': return { color: 'text-red-400', bg: 'bg-red-900/20', icon: <AlertTriangle size={16} />, text: 'Error' };
    }
  };

  // Helper to fix Dropbox URLs for preview
  const getPreviewImage = (url: string) => {
    if (!url) return '';
    if (url.includes('dropbox.com') && url.includes('dl=0')) {
      return url.replace('dl=0', 'raw=1');
    }
    return url;
  };

  const statusUI = getStatusUI();
  const configSizeMB = (configSize / (1024 * 1024)).toFixed(2);
  const isTooLarge = configSize > 3 * 1024 * 1024; // 3MB Limit Warning

  const renderVideoSlot = (slot: string, fieldName: keyof SiteConfig) => {
    const value = formData[fieldName] as string;
    const isFile = value && value.startsWith('data:video');

    return (
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
         <div className="flex justify-between items-center">
             <label className="text-xs font-bold text-yellow-500 flex items-center gap-2">
               <PlaySquare size={14} /> Opción {slot}
             </label>
             {value && <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">Activo</span>}
         </div>
         
         <div className="flex gap-2">
            <input 
              type="text" 
              name={fieldName} 
              value={isFile ? '(Archivo pesado cargado - BORRAR PARA GUARDAR)' : value} 
              onChange={handleChange}
              disabled={isFile}
              placeholder={`Pega aquí la URL del Video ${slot}`}
              className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none font-mono text-[10px] disabled:opacity-50"
            />
            {value && (
              <button 
                type="button" 
                onClick={() => clearVideo(fieldName)} 
                className="bg-red-900/30 text-red-400 px-3 py-1 rounded-lg hover:bg-red-900/50 flex items-center gap-1"
                title="Borrar video"
              >
                  <Trash2 size={14} />
              </button>
            )}
         </div>

         <label className={`flex items-center justify-center gap-2 border border-dashed ${isFile ? 'border-red-500 bg-red-900/10 animate-pulse' : 'border-zinc-700 hover:border-yellow-500 hover:bg-black'} p-3 rounded-lg cursor-pointer transition-all group`}>
            {isFile ? (
                <>
                    <FileVideo size={16} className="text-red-500" />
                    <span className="text-red-400 font-bold text-[10px]">VIDEO PESADO (NO SE GUARDARÁ)</span>
                </>
            ) : (
                <>
                    <Upload size={16} className="text-zinc-500 group-hover:text-yellow-400 transition-colors" />
                    <span className="text-zinc-400 text-[10px] group-hover:text-white">Subir MP4 (Solo archivos peques - Max 1.5MB)</span>
                </>
            )}
            <input 
                type="file" 
                accept="video/mp4,video/webm" 
                onChange={(e) => handleVideoUpload(e, fieldName)}
                className="hidden"
            />
         </label>
      </div>
    );
  };

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
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs text-zinc-400">Edita la web</p>
                   {/* Size Indicator */}
                   <span className={`text-[10px] px-2 rounded-full border ${isTooLarge ? 'border-red-500 text-red-500 bg-red-900/10' : 'border-zinc-700 text-zinc-500'}`}>
                      Peso Datos: {configSizeMB} MB
                   </span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Warning if too large */}
        {isTooLarge && (
            <div className="bg-red-900/20 border-b border-red-500/30 p-2 flex items-center justify-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                <AlertOctagon size={14} />
                ¡CUIDADO! Tienes archivos muy pesados cargados. La base de datos fallará. Borra los videos subidos y usa enlaces.
            </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="admin-form" onSubmit={handleSubmit} className="space-y-12">
            
            {/* DB Connection */}
            <div className={`border p-4 rounded-xl space-y-3 transition-colors ${dbStatus === 'error' ? 'border-red-500/50 bg-red-900/10' : dbStatus === 'ready' ? 'border-green-500/50 bg-green-900/5' : 'border-yellow-500/30 bg-yellow-900/5'}`}>
               <div className="flex justify-between items-center">
                  <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                    <Database size={16} /> Base de Datos
                  </h3>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${statusUI.bg} ${statusUI.color}`}>
                     {statusUI.icon}
                     <span>{statusUI.text}</span>
                  </div>
               </div>
               
               <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">URL de Conexión (Neon Postgres)</label>
                  <div className="flex gap-2 relative">
                    <input 
                      type="password" 
                      value={dbUrl} 
                      onChange={handleDbUrlChange}
                      placeholder="postgres://..."
                      className={`w-full bg-black border rounded-lg p-3 text-white focus:outline-none font-mono text-xs pr-10 transition-colors ${dbStatus === 'error' ? 'border-red-500' : dbStatus === 'ready' ? 'border-green-500' : 'border-zinc-700 focus:border-yellow-500'}`}
                    />
                    {dbStatus === 'connecting' && <div className="absolute right-3 top-3"><Loader2 size={16} className="animate-spin text-yellow-500" /></div>}
                  </div>
                  <p className={`text-[10px] font-mono ${statusUI.color}`}>{dbMessage || 'Introduce URL para conectar.'}</p>
               </div>
            </div>

             {/* General Settings & Footer */}
             <div className="space-y-4 border border-zinc-800 p-4 rounded-xl bg-zinc-950/50">
                <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                   <Type size={16} /> Configuración General
                </h3>
                
                {/* Assistant Toggle */}
                <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-2 rounded text-white"><Mic size={18} /></div>
                        <div>
                            <p className="font-bold text-sm text-white">Asistente de Voz (IA)</p>
                            <p className="text-[10px] text-zinc-500">Activa el botón de micrófono flotante</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="enableAssistant" checked={formData.enableAssistant !== false} onChange={handleToggle} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                </div>

                {/* Footer Settings */}
                <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-zinc-400 block">Título Pie de Página</label>
                    <input type="text" name="footerTitle" value={formData.footerTitle} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                    
                    <label className="text-xs font-bold text-zinc-400 block">Texto Pie de Página</label>
                    <textarea name="footerText" value={formData.footerText} onChange={handleChange} rows={2} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none resize-none" />
                </div>
             </div>

            {/* Video Section with Warnings */}
            <div className="space-y-3 border-2 border-dashed border-zinc-800 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <Video size={16} className="text-yellow-400" />
                    <h3 className="text-yellow-400 font-bold uppercase text-sm">Videos de Fondo</h3>
                </div>
                <p className="text-[10px] text-zinc-400 mb-2 bg-black p-2 rounded border border-zinc-800">
                  ⚠️ <strong>IMPORTANTE:</strong> No subas archivos de video directamente si pesan más de 1MB. Usa enlaces de internet. Si intentas guardar archivos grandes, el sistema se bloqueará.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderVideoSlot('A', 'videoUrlA')}
                    {renderVideoSlot('B', 'videoUrlB')}
                    {renderVideoSlot('C', 'videoUrlC')}
                    {renderVideoSlot('D', 'videoUrlD')}
                </div>
            </div>

            {/* Rest of Sections (Order, General, Fleet, etc) */}
            {/* 1. Section Ordering */}
            <div className="space-y-4">
              <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Layout size={16} /> Orden de Secciones
              </h3>
              <div className="space-y-2">
                {(formData.sectionOrder || []).map((sectionId, index) => (
                  <div key={sectionId} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <span className="text-sm font-bold text-white">{SECTION_LABELS[sectionId] || sectionId}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 text-zinc-400 hover:text-yellow-400"><ArrowUp size={18} /></button>
                      <button type="button" onClick={() => moveSection(index, 'down')} disabled={index === (formData.sectionOrder?.length || 0) - 1} className="p-1 text-zinc-400 hover:text-yellow-400"><ArrowDown size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Título Principal</label>
                  <input type="text" name="heroTitle" value={formData.heroTitle} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">WhatsApp (Número o Enlace)</label>
                  <input type="text" name="whatsappUrl" value={formData.whatsappUrl} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">Subtítulo</label>
                <textarea name="heroSubtitle" value={formData.heroSubtitle} onChange={handleChange} rows={2} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none resize-none" />
            </div>

            {/* Fleet */}
            <div className="space-y-4">
               <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                 <h3 className="text-yellow-400 font-bold uppercase text-sm">Flota</h3>
                 <button type="button" onClick={addFleetItem} className="flex items-center gap-1 text-xs bg-yellow-500 text-black px-3 py-1 rounded font-bold"><Plus size={14} /> Añadir</button>
               </div>
               <div className="space-y-4">
                 {formData.fleetItems?.map((item, index) => (
                    <div key={item.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative group">
                        <button type="button" onClick={() => removeFleetItem(index)} className="absolute top-2 right-2 text-red-500 p-2 hover:bg-red-900/30 rounded"><Trash2 size={16} /></button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <input type="text" value={item.title} onChange={(e) => handleFleetChange(index, 'title', e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm" placeholder="Modelo" />
                                <textarea value={item.description} onChange={(e) => handleFleetChange(index, 'description', e.target.value)} rows={2} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm resize-none" placeholder="Descripción" />
                           </div>
                           <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 block">URL Imagen (No subir archivo)</label>
                                <input type="text" value={item.imageUrl} onChange={(e) => handleFleetChange(index, 'imageUrl', e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono" placeholder="https://..." />
                                {item.imageUrl && <img src={getPreviewImage(item.imageUrl)} alt="Preview" className="h-16 w-full object-cover rounded border border-zinc-800 opacity-50" />}
                           </div>
                        </div>
                    </div>
                 ))}
               </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 rounded-b-2xl flex justify-between items-center">
          <button type="button" onClick={handleReset} className="flex items-center gap-2 text-red-500 hover:text-red-400 font-bold text-sm px-4 py-2 hover:bg-red-500/10 rounded-lg">
            <RotateCcw size={16} /> Restaurar
          </button>
          
          <button 
            type="submit" 
            form="admin-form"
            disabled={dbStatus === 'saving' || isTooLarge}
            className={`flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl shadow-lg transition-all ${dbStatus === 'saving' || isTooLarge ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {dbStatus === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isTooLarge ? '¡Demasiado Pesado!' : (dbStatus === 'saving' ? 'Guardando...' : 'Guardar Cambios')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;