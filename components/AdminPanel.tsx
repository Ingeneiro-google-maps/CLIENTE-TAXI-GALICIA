import React, { useState, useEffect, useRef } from 'react';
import { SiteConfig, FleetItem, PartnerItem, RootFile } from '../types';
import { X, Save, RotateCcw, Lock, Plus, Trash2, ArrowUp, ArrowDown, Layout, Loader2, Database, AlertTriangle, CheckCircle, Server, RefreshCw, Smartphone, Mail, Video, Upload, FileVideo, MessageCircle, PlaySquare, AlertOctagon, Mic, Type, Key, Stamp, Car, Bus, Phone, Image as ImageIcon, ShieldAlert, ArrowRight, MapPin, Handshake, LayoutGrid, Search, Globe, CheckCircle2, FileText, Download, Copy, ExternalLink, RefreshCcw, Eye, CloudUpload, Link as LinkIcon, FolderOpen, FileCode } from 'lucide-react';
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
  'bus': 'Transporte Autobús / Grupos',
  'contact': 'Sección de Contacto',
  'partners': 'Socios y Colaboradores'
};

type DbStatus = 'idle' | 'connecting' | 'creating' | 'ready' | 'error' | 'saving';
const ADMIN_PASSWORD = "8069987Pt";

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // --- Panel State ---
  // Initialize with currentConfig but fallback to DEFAULT to prevent null crashes
  const [formData, setFormData] = useState<SiteConfig>({ ...DEFAULT_CONFIG, ...currentConfig });
  const [dbUrl, setDbUrl] = useState('');
  const [dbStatus, setDbStatus] = useState<DbStatus>('idle');
  const [dbMessage, setDbMessage] = useState('');
  const [configSize, setConfigSize] = useState(0);
  const timeoutRef = useRef<any>(null);
  
  // Sitemap states
  const [copiedLink, setCopiedLink] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [liveSitemapContent, setLiveSitemapContent] = useState('');
  const [isGeneratingSitemap, setIsGeneratingSitemap] = useState(false);
  
  // Upload States
  const [isUploadingSitemap, setIsUploadingSitemap] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // --- LOGIC HELPERS DEFINED BEFORE EARLY RETURNS ---

  // CRITICAL FIX: Safe image preview to prevent rendering crash
  const getPreviewImage = (url: string | undefined | null) => {
    if (!url || typeof url !== 'string') return '';
    let finalUrl = url;
    // Fix Dropbox direct link if needed (sync with App.tsx logic)
    if (finalUrl.includes('dropbox.com') && finalUrl.includes('dl=0')) {
      finalUrl = finalUrl.replace('dl=0', 'raw=1');
    }
    return finalUrl;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, checked } = e.target;
     setFormData(prev => ({ ...prev, [name]: checked }));
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

  const handleDbUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setDbUrl(newVal);
    
    // Debounce connection test
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      testDbConnection(newVal);
    }, 800);
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de restablecer los valores originales? Esto borrará tus cambios no guardados.')) {
      setFormData(DEFAULT_CONFIG);
    }
  };

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

  // --- ROOT FILE MANAGER LOGIC ---
  const handleRootFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Limit size: 1MB for root files to play safe
      if (file.size > 1024 * 1024) {
          alert("El archivo es demasiado grande. Máximo 1MB para archivos raíz.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          const newFile: RootFile = {
              id: Date.now().toString(),
              name: file.name,
              content: content,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
          };
          
          setFormData(prev => ({
              ...prev,
              rootFiles: [...(prev.rootFiles || []), newFile]
          }));
      };
      reader.readAsDataURL(file);
      // Clear input
      e.target.value = '';
  };

  const removeRootFile = (index: number) => {
      if(!confirm("¿Borrar este archivo de la configuración?")) return;
      const newFiles = [...(formData.rootFiles || [])];
      newFiles.splice(index, 1);
      setFormData(prev => ({ ...prev, rootFiles: newFiles }));
  };

  // --- SITEMAP GENERATOR LOGIC ---
  const generateSitemap = () => {
      setIsGeneratingSitemap(true);

      // Simulation delay for the "Taxi Animation"
      setTimeout(() => {
        const domain = formData.domainUrl ? formData.domainUrl.replace(/\/$/, '') : 'https://tudominio.com';
        const date = new Date().toISOString().split('T')[0];
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- PÁGINA PRINCIPAL -->
  <url>
    <loc>${domain}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

        // Mapa de prioridades
        const sectionMeta: Record<string, { priority: string, changefreq: string }> = {
            'reservation': { priority: '1.0', changefreq: 'weekly' },
            'fleet': { priority: '0.9', changefreq: 'monthly' },
            'services': { priority: '0.8', changefreq: 'monthly' },
            'transfers': { priority: '0.8', changefreq: 'monthly' },
            'bus': { priority: '0.8', changefreq: 'monthly' },
            'contact': { priority: '0.7', changefreq: 'yearly' },
            'partners': { priority: '0.5', changefreq: 'yearly' }
        };

        // Generar entradas dinámicas
        if (formData.sectionOrder && formData.sectionOrder.length > 0) {
            formData.sectionOrder.forEach(sectionId => {
                const meta = sectionMeta[sectionId] || { priority: '0.5', changefreq: 'monthly' };
                const sectionName = SECTION_LABELS[sectionId] || sectionId;
                
                xml += `
  <!-- Sección: ${sectionName} -->
  <url>
    <loc>${domain}/#${sectionId}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>
  </url>`;
            });
        }

        xml += `\n</urlset>`;

        setFormData(prev => ({ ...prev, sitemapXml: xml }));
        setIsGeneratingSitemap(false);
        setUploadSuccess(false); // Reset upload status on new gen
      }, 2000); // 2 seconds animation
  };

  const handleUploadSitemap = async () => {
      if (!formData.sitemapXml) {
          alert("Primero debes generar el sitemap.");
          return;
      }
      if (!formData.domainUrl) {
          alert("Necesitas configurar el Dominio primero (Campo #1).");
          return;
      }

      setIsUploadingSitemap(true);
      
      // Simulate network latency + Save to DB
      setTimeout(async () => {
          const success = await onSave(formData);
          setIsUploadingSitemap(false);
          if (success) {
              setUploadSuccess(true);
          } else {
              alert("Error al guardar en la base de datos.");
          }
      }, 1500);
  };

  const downloadSitemap = () => {
      if (!formData.sitemapXml) {
          alert("Primero debes generar el sitemap.");
          return;
      }
      const element = document.createElement("a");
      const file = new Blob([formData.sitemapXml], {type: 'text/xml'});
      element.href = URL.createObjectURL(file);
      element.download = "sitemap.xml";
      document.body.appendChild(element); // Required for this to work in FireFox
      element.click();
      document.body.removeChild(element);
  };

  const copySitemapLink = () => {
      const domain = formData.domainUrl ? formData.domainUrl.replace(/\/$/, '') : '';
      if (!domain) {
          alert("Introduce primero tu dominio.");
          return;
      }
      const link = `${domain}/sitemap.xml`;
      navigator.clipboard.writeText(link).then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
      });
  };

  const checkLiveSitemap = async () => {
    const domain = formData.domainUrl ? formData.domainUrl.replace(/\/$/, '') : '';
    if (!domain) {
        alert("Introduce tu dominio primero.");
        return;
    }
    
    const url = `${domain}/sitemap.xml`;
    setVerifyStatus('checking');
    setLiveSitemapContent('');

    try {
        // Add timestamp to prevent caching
        const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
            const text = await response.text();
            setLiveSitemapContent(text);
            setVerifyStatus('success');
        } else {
            setLiveSitemapContent(`Error ${response.status}: ${response.statusText}`);
            setVerifyStatus('error');
        }
    } catch (error: any) {
        setLiveSitemapContent(`Error de conexión (Posiblemente CORS o URL incorrecta): ${error.message}`);
        setVerifyStatus('error');
    }
  };

  // Fleet Management
  const handleFleetChange = (index: number, field: keyof FleetItem, value: any) => {
    const newItems = [...(formData.fleetItems || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  const addFleetImage = (fleetIndex: number) => {
    const newItems = [...(formData.fleetItems || [])];
    if (!newItems[fleetIndex].images) newItems[fleetIndex].images = [];
    newItems[fleetIndex].images.push('');
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  const updateFleetImage = (fleetIndex: number, imgIndex: number, value: string) => {
    const newItems = [...(formData.fleetItems || [])];
    newItems[fleetIndex].images[imgIndex] = value;
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  const removeFleetImage = (fleetIndex: number, imgIndex: number) => {
    const newItems = [...(formData.fleetItems || [])];
    newItems[fleetIndex].images.splice(imgIndex, 1);
    setFormData(prev => ({ ...prev, fleetItems: newItems }));
  };

  const addFleetItem = () => {
    const newItem: FleetItem = {
      id: Date.now().toString(),
      title: 'Nuevo Vehículo',
      description: 'Descripción...',
      images: ['']
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

  // Partners Management
  const handlePartnerChange = (index: number, field: keyof PartnerItem, value: string) => {
    const newItems = [...(formData.partnerItems || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, partnerItems: newItems }));
  };

  const addPartnerItem = () => {
    const newItem: PartnerItem = {
        id: Date.now().toString(),
        name: 'Nuevo Socio',
        logoUrl: ''
    };
    setFormData(prev => ({
        ...prev,
        partnerItems: [...(prev.partnerItems || []), newItem]
    }));
  };

  const removePartnerItem = (index: number) => {
      const newItems = [...(formData.partnerItems || [])];
      newItems.splice(index, 1);
      setFormData(prev => ({ ...prev, partnerItems: newItems }));
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

  const statusUI = getStatusUI();
  const configSizeMB = (configSize / (1024 * 1024)).toFixed(2);
  const isTooLarge = configSize > 3 * 1024 * 1024; // 3MB Limit Warning

  // Robust video slot render
  const renderVideoSlot = (slot: string, fieldName: keyof SiteConfig) => {
    const value = formData[fieldName] as string | undefined;
    const safeValue = value || '';
    const isFile = safeValue.startsWith('data:video');

    return (
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
         <div className="flex justify-between items-center">
             <label className="text-xs font-bold text-yellow-500 flex items-center gap-2">
               <PlaySquare size={14} /> Opción {slot}
             </label>
             {safeValue && <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">Activo</span>}
         </div>
         
         <div className="flex gap-2">
            <input 
              type="text" 
              name={fieldName} 
              value={isFile ? '(Archivo pesado cargado - BORRAR PARA GUARDAR)' : safeValue} 
              onChange={handleChange}
              disabled={isFile}
              placeholder={`Pega aquí la URL del Video ${slot}`}
              className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none font-mono text-[10px] disabled:opacity-50"
            />
            {safeValue && (
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

  // --- EFFECTS ---

  // Reset Auth on Close
  useEffect(() => {
    if (!isOpen) {
        setIsAuthenticated(false);
        setPasswordInput('');
        setAuthError(false);
    }
  }, [isOpen]);

  // Sync internal state if currentConfig changes
  useEffect(() => {
    if (isOpen) {
        // Migration check for admin panel state
        const configWithImages = { ...currentConfig };
        
        // Ensure fleetItems exists and has images array
        if (!configWithImages.fleetItems) {
             configWithImages.fleetItems = [];
        } else {
             configWithImages.fleetItems = configWithImages.fleetItems.map((item: any) => {
                const newItem = { ...item };
                if (newItem.imageUrl && (!newItem.images || newItem.images.length === 0)) {
                    newItem.images = [newItem.imageUrl];
                }
                if (!newItem.images) newItem.images = [];
                return newItem;
            });
        }

        // Ensure partner items exist
        if (!configWithImages.partnerItems) {
            configWithImages.partnerItems = [];
        }

        // Ensure root files exist
        if (!configWithImages.rootFiles) {
            configWithImages.rootFiles = [];
        }
        
        setFormData(configWithImages);
        
        // Calculate initial size
        try {
            const size = new Blob([JSON.stringify(configWithImages)]).size;
            setConfigSize(size);
        } catch (e) {
            setConfigSize(0);
        }

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
     try {
         const size = new Blob([JSON.stringify(formData)]).size;
         setConfigSize(size);
     } catch (e) {}
  }, [formData]);

  if (!isOpen) return null;

  // --- AUTH HANDLE ---
  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === ADMIN_PASSWORD) {
          setIsAuthenticated(true);
          setAuthError(false);
      } else {
          setAuthError(true);
          setPasswordInput('');
      }
  };

  // --- LOGIN SCREEN RENDER ---
  if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
             <div className="w-full max-w-md bg-zinc-900 border border-yellow-500/50 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                 {/* Decorative */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.5)]"></div>
                 
                 <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                     <X size={24} />
                 </button>

                 <div className="flex flex-col items-center text-center mb-8">
                     <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-zinc-800 mb-4 shadow-inner">
                         <Lock size={32} className="text-yellow-500" />
                     </div>
                     <h2 className="text-2xl font-black text-white uppercase tracking-tight">Acceso Restringido</h2>
                     <p className="text-zinc-400 text-sm mt-2">Introduce la clave de administrador para editar la web.</p>
                 </div>

                 <form onSubmit={handleLogin} className="space-y-6">
                     <div className="space-y-2">
                         <div className="relative">
                             <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                             <input 
                                type="password" 
                                autoFocus
                                placeholder="Contraseña..." 
                                className={`w-full bg-black border ${authError ? 'border-red-500 animate-shake' : 'border-zinc-700 focus:border-yellow-500'} rounded-xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 outline-none transition-all`}
                                value={passwordInput}
                                onChange={(e) => {
                                    setPasswordInput(e.target.value);
                                    if(authError) setAuthError(false);
                                }}
                             />
                         </div>
                         {authError && (
                             <p className="text-red-500 text-xs font-bold flex items-center justify-center gap-1 animate-pulse">
                                 <ShieldAlert size={12} /> Contraseña incorrecta
                             </p>
                         )}
                     </div>

                     <button 
                        type="submit" 
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                     >
                         ENTRAR AL PANEL <ArrowRight size={20} />
                     </button>
                 </form>
                 
                 <div className="mt-6 text-center">
                     <p className="text-[10px] text-zinc-600 font-mono">ID: SYSTEM_SECURE_V1</p>
                 </div>
             </div>
        </div>
      );
  }

  // --- MAIN ADMIN LOGIC ---

  // Safe Guard: If something went terribly wrong during init
  if (!formData) return null;

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

            {/* NEW: SEO & GOOGLE SECTION */}
            <div className="space-y-4 border-2 border-green-500/20 p-4 rounded-xl bg-green-950/10 relative overflow-hidden">
               <h3 className="text-green-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                   <Globe size={16} /> SEO y Google Search Console
               </h3>
               <p className="text-[10px] text-zinc-400">Configura cómo te encuentran en Google y verifica tu propiedad.</p>
               
               {/* Google Verification */}
               <div className="bg-black/50 p-4 rounded-lg border border-zinc-700 space-y-3">
                   <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-white flex items-center gap-2">
                           <CheckCircle2 size={14} className="text-green-500" /> Verificación de Propiedad
                       </label>
                       <a href="https://search.google.com/search-console/welcome" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                           Ir a Search Console <ArrowRight size={10} />
                       </a>
                   </div>
                   <input 
                      type="text" 
                      name="googleVerificationId" 
                      value={formData.googleVerificationId || ''} 
                      onChange={handleChange} 
                      className="w-full bg-zinc-900 border border-zinc-600 rounded-lg p-3 text-white focus:border-green-500 outline-none font-mono text-xs"
                      placeholder='Ej: Pega aquí el código "google-site-verification=..." o solo el hash'
                   />
                   <p className="text-[10px] text-zinc-500">
                       Copia el código de etiqueta HTML que te da Google Search Console y pégalo aquí para verificar que eres el dueño de la web.
                   </p>
               </div>

               {/* Meta Data */}
               <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-1">
                       <label className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Search size={12}/> Título en Google (Meta Title)</label>
                       <input 
                          type="text" 
                          name="seoTitle" 
                          value={formData.seoTitle || ''} 
                          onChange={handleChange} 
                          className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm focus:border-green-500 outline-none" 
                          placeholder="Ej: Taxi Caldas | Servicio 24H"
                       />
                   </div>
                   
                   <div className="space-y-1">
                       <label className="text-xs font-bold text-zinc-400">Descripción (Lo que sale debajo del enlace)</label>
                       <textarea 
                          name="seoDescription" 
                          value={formData.seoDescription || ''} 
                          onChange={handleChange} 
                          rows={2}
                          className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-green-500 outline-none resize-none" 
                          placeholder="Ej: Reserva tu taxi oficial. Traslados aeropuerto y Camino de Santiago..."
                       />
                   </div>

                   <div className="space-y-1">
                       <label className="text-xs font-bold text-zinc-400">Palabras Clave (Separadas por comas)</label>
                       <input 
                          type="text" 
                          name="seoKeywords" 
                          value={formData.seoKeywords || ''} 
                          onChange={handleChange} 
                          className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-green-500 outline-none" 
                          placeholder="Ej: taxi, caldas, camino santiago, aeropuerto"
                       />
                   </div>
               </div>

               {/* ROOT FILES MANAGER (NEW SECTION) */}
               <div className="bg-black/50 p-4 rounded-lg border border-zinc-700 space-y-4 relative overflow-hidden">
                   <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                       <label className="text-xs font-bold text-white flex items-center gap-2">
                           <FolderOpen size={14} className="text-purple-400" /> Gestor de Archivos Raíz (Public)
                       </label>
                       <div className="flex items-center gap-2">
                           <span className="text-[10px] text-zinc-500">robots.txt, ads.txt, html...</span>
                       </div>
                   </div>

                   <p className="text-[10px] text-zinc-400">
                       Sube archivos que necesiten estar en la raíz de tu dominio (ej: validación de Google). Se guardarán en la base de datos.
                   </p>

                   {/* File Input */}
                   <div className="relative border-2 border-dashed border-zinc-700 hover:border-purple-500 rounded-lg p-4 transition-colors group text-center cursor-pointer bg-zinc-900/30">
                       <input 
                           type="file" 
                           onChange={handleRootFileUpload} 
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           title="Subir archivo"
                       />
                       <div className="flex flex-col items-center gap-2 pointer-events-none">
                           <CloudUpload size={24} className="text-zinc-500 group-hover:text-purple-400 transition-colors" />
                           <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Click para subir archivo (Max 1MB)</span>
                       </div>
                   </div>

                   {/* File List */}
                   {formData.rootFiles && formData.rootFiles.length > 0 && (
                       <div className="space-y-2 mt-2">
                           {formData.rootFiles.map((file, index) => (
                               <div key={file.id || index} className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-zinc-800 hover:border-purple-500/30 transition-colors">
                                   <div className="flex items-center gap-3 overflow-hidden">
                                       <FileCode size={16} className="text-purple-400 shrink-0" />
                                       <div className="overflow-hidden">
                                           <p className="text-xs text-white font-bold truncate">{file.name}</p>
                                           <p className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(1)} KB • {new Date(file.lastModified || Date.now()).toLocaleDateString()}</p>
                                       </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-2 shrink-0">
                                       {formData.domainUrl && (
                                            <a 
                                                href={`${formData.domainUrl?.replace(/\/$/, '')}/${file.name}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-1.5 hover:bg-zinc-800 rounded text-blue-400"
                                                title="Ver enlace simulado"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                       )}
                                       <button 
                                           onClick={() => removeRootFile(index)} 
                                           className="p-1.5 hover:bg-red-900/30 rounded text-red-500"
                                           title="Borrar archivo"
                                       >
                                           <Trash2 size={14} />
                                       </button>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>

               {/* SITEMAP GENERATOR */}
               <div className="bg-black/50 p-4 rounded-lg border border-zinc-700 space-y-4 mt-2 relative overflow-hidden">
                   
                   {/* TAXI SIMULADO ANIMATION OVERLAY */}
                   {isGeneratingSitemap && (
                     <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center overflow-hidden">
                        <p className="text-yellow-400 font-bold uppercase animate-pulse mb-8 tracking-widest">Generando Sitemap...</p>
                        
                        {/* Taxi Driving Animation */}
                        <div className="w-full relative h-20">
                           <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-700 transform -translate-y-1/2"></div>
                           <div className="absolute top-1/2 left-0 w-full h-1 border-t border-dashed border-white/20 transform -translate-y-1/2"></div>
                           
                           <div className="absolute top-1/2 transform -translate-y-1/2 animate-drive" style={{animationDuration: '2s'}}>
                              {/* Simple SVG Taxi */}
                              <svg width="60" height="30" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                                <path d="M10 15L15 5H45L50 15H60V25H0V15H10Z" fill="#FACC15"/>
                                <circle cx="12" cy="25" r="4" fill="#333"/>
                                <circle cx="48" cy="25" r="4" fill="#333"/>
                                <rect x="25" y="2" width="10" height="3" fill="#FACC15" stroke="black" strokeWidth="0.5"/>
                                <path d="M18 6H42" stroke="black" strokeWidth="0.5" strokeOpacity="0.5"/>
                              </svg>
                           </div>
                        </div>
                     </div>
                   )}

                   <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                       <label className="text-xs font-bold text-white flex items-center gap-2">
                           <FileText size={14} className="text-blue-400" /> Generador de Sitemap.xml
                       </label>
                       <div className="flex items-center gap-2">
                           <span className="text-[10px] text-zinc-500">Esencial para Google</span>
                       </div>
                   </div>

                   <div className="space-y-2">
                       <label className="text-xs font-bold text-zinc-400">1. Tu Dominio Real (URL completa)</label>
                       <div className="flex gap-2">
                           <input 
                              type="text" 
                              name="domainUrl" 
                              value={formData.domainUrl || ''} 
                              onChange={handleChange} 
                              className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg p-2 text-white focus:border-blue-500 outline-none text-xs"
                              placeholder="https://tudominio.com"
                           />
                           <button type="button" onClick={generateSitemap} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg hover:shadow-blue-500/20">
                               <RefreshCw size={12} className={isGeneratingSitemap ? 'animate-spin' : ''}/> Generar
                           </button>
                       </div>
                   </div>

                   {formData.sitemapXml && (
                       <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-zinc-400">2. Vista Previa (Todas las secciones)</label>
                               <textarea 
                                  readOnly 
                                  value={formData.sitemapXml} 
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] font-mono text-zinc-400 h-32 resize-none"
                               />
                           </div>
                           
                           {/* NEW: DIRECT UPLOAD FEATURE */}
                           <div className="p-4 bg-zinc-900/80 border border-zinc-700 rounded-xl space-y-4">
                                <label className="text-xs font-bold text-white flex items-center gap-2">
                                    <CloudUpload size={16} className="text-yellow-400" /> Publicar en la Nube
                                </label>
                                
                                <div className="flex flex-col gap-3">
                                    <button 
                                        type="button" 
                                        onClick={handleUploadSitemap}
                                        disabled={isUploadingSitemap}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-3 rounded-lg border border-zinc-600 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isUploadingSitemap ? <Loader2 className="animate-spin" size={14}/> : <CloudUpload size={14}/>}
                                        {isUploadingSitemap ? 'Subiendo archivo...' : 'SUBIR SITEMAP AL DIRECTORIO (DB)'}
                                    </button>

                                    {uploadSuccess && (
                                        <div className="bg-green-900/30 border border-green-500/50 p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                            <CheckCircle size={20} className="text-green-400 shrink-0" />
                                            <div className="overflow-hidden w-full">
                                                <p className="text-green-400 text-xs font-bold">¡Subida Exitosa!</p>
                                                <p className="text-green-200/70 text-[10px] truncate mb-1">
                                                    Tu sitemap debe estar accesible aquí:
                                                </p>
                                                <a 
                                                   href={`${formData.domainUrl?.replace(/\/$/, '')}/sitemap.xml`} 
                                                   target="_blank" 
                                                   rel="noreferrer" 
                                                   className="bg-black/50 block w-full p-2 rounded border border-green-500/30 text-blue-400 text-[10px] font-mono hover:text-blue-300 hover:border-blue-400 transition-colors truncate"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <ExternalLink size={10} /> 
                                                        {`${formData.domainUrl?.replace(/\/$/, '')}/sitemap.xml`}
                                                    </div>
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                           </div>

                           <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-3">
                               <div className="flex items-center gap-2 text-blue-300 text-xs font-bold">
                                   <AlertTriangle size={14} /> Opción Manual (Hosting Estático)
                               </div>
                               <p className="text-[10px] text-zinc-300 leading-relaxed">
                                   Si usas un hosting estático simple, es posible que necesites subir el archivo manualmente.
                               </p>
                               
                               <div className="flex gap-2">
                                   <button type="button" onClick={downloadSitemap} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                                       <Download size={14} /> Descargar Archivo
                                   </button>
                                   <button type="button" onClick={copySitemapLink} className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 text-green-400 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                                       {copiedLink ? <CheckCircle size={14} /> : <Copy size={14} />} 
                                       {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                                   </button>
                               </div>
                               
                               {formData.domainUrl && (
                                   <div className="text-center">
                                       <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-1">
                                           Ir a Validar en Google <ExternalLink size={10} />
                                       </a>
                                   </div>
                               )}
                           </div>

                           {/* LIVE VERIFICATION TOOL */}
                           <div className="pt-4 border-t border-zinc-700">
                                <label className="text-xs font-bold text-yellow-500 mb-2 block flex items-center gap-2">
                                    <Search size={14} /> Verificación en Vivo
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <button 
                                        type="button" 
                                        onClick={checkLiveSitemap}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 rounded-lg border border-zinc-600 flex items-center gap-2 w-full justify-center transition-colors"
                                    >
                                        {verifyStatus === 'checking' ? <Loader2 className="animate-spin" size={14}/> : <Eye size={14}/>}
                                        Comprobar URL: {formData.domainUrl ? `${formData.domainUrl.replace(/\/$/, '')}/sitemap.xml` : '...'}
                                    </button>
                                </div>
                                
                                {verifyStatus !== 'idle' && (
                                    <div className={`p-3 rounded-lg border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto animate-in fade-in ${verifyStatus === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'}`}>
                                        {verifyStatus === 'success' ? (
                                            <>
                                                <div className="flex items-center gap-2 font-bold mb-2"><CheckCircle2 size={14}/> ¡Archivo encontrado correctamente!</div>
                                                <div className="opacity-70 text-[10px]">{liveSitemapContent.substring(0, 300)}...</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 font-bold mb-2"><AlertTriangle size={14}/> Error al leer el archivo</div>
                                                {liveSitemapContent}
                                                <div className="mt-2 text-zinc-400 font-sans border-t border-red-500/30 pt-2">
                                                    <strong>Posibles causas:</strong>
                                                    <ul className="list-disc pl-4 mt-1 space-y-1">
                                                        <li>No has subido el archivo al hosting.</li>
                                                        <li>El dominio está mal escrito.</li>
                                                        <li>Bloqueo de seguridad (CORS). <a href={`${formData.domainUrl?.replace(/\/$/, '')}/sitemap.xml`} target="_blank" rel="noreferrer" className="underline text-blue-400 hover:text-blue-300">Intenta abrirlo manualmente aquí</a>.</li>
                                                    </ul>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                           </div>
                       </div>
                   )}
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

                {/* Demo Mode Toggle */}
                <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-600 p-2 rounded text-white"><Stamp size={18} /></div>
                        <div>
                            <p className="font-bold text-sm text-white">Modo Demostración</p>
                            <p className="text-[10px] text-zinc-500">Muestra marca de agua en la web</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="demoMode" checked={formData.demoMode || false} onChange={handleToggle} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                </div>

                {/* API Key Field */}
                <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3 w-full">
                        <div className="bg-blue-600 p-2 rounded text-white shrink-0"><Key size={18} /></div>
                        <div className="w-full">
                            <p className="font-bold text-sm text-white">API Key de Google Gemini</p>
                            <p className="text-[10px] text-zinc-500 mb-1">Para solucionar errores de dominio (1008)</p>
                            <input 
                              type="password" 
                              name="geminiApiKey" 
                              value={formData.geminiApiKey || ''} 
                              onChange={handleChange} 
                              placeholder="Pega aquí tu API Key (AIza...)"
                              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs focus:border-yellow-500 outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Settings */}
                <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-zinc-400 block">Título Pie de Página</label>
                    <input type="text" name="footerTitle" value={formData.footerTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                    
                    <label className="text-xs font-bold text-zinc-400 block">Texto Pie de Página</label>
                    <textarea name="footerText" value={formData.footerText || ''} onChange={handleChange} rows={2} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none resize-none" />
                </div>
             </div>

            {/* 1. Section Ordering (MOVED HERE FOR VISIBILITY) */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
              <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider pb-4 flex items-center gap-2">
                <Layout size={18} /> Organizador de la Web (Arrastrar / Mover)
              </h3>
              <p className="text-zinc-500 text-xs mb-4">Elige qué secciones aparecen primero en tu página.</p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {(formData.sectionOrder || []).map((sectionId, index) => (
                  <div key={sectionId} className="flex items-center justify-between bg-black p-3 rounded-lg border border-zinc-800 hover:border-yellow-500/50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <span className="bg-zinc-800 text-zinc-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                        <span className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{SECTION_LABELS[sectionId] || sectionId}</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        type="button" 
                        onClick={() => moveSection(index, 'up')} 
                        disabled={index === 0} 
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30"
                        title="Subir"
                      >
                          <ArrowUp size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => moveSection(index, 'down')} 
                        disabled={index === (formData.sectionOrder?.length || 0) - 1} 
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30"
                        title="Bajar"
                      >
                          <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">Título Principal</label>
                  <input type="text" name="heroTitle" value={formData.heroTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">WhatsApp (Número o Enlace)</label>
                  <input type="text" name="whatsappUrl" value={formData.whatsappUrl || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">Subtítulo</label>
                <textarea name="heroSubtitle" value={formData.heroSubtitle || ''} onChange={handleChange} rows={2} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none resize-none" />
            </div>

            {/* Transfers Text Editing */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-xl bg-zinc-950/50">
                <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                   <Car size={16} /> Textos Sección Traslados
                </h3>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Título Principal de la Sección</label>
                    <input type="text" name="transfersTitle" value={formData.transfersTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                    {/* Airport */}
                    <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <label className="text-xs font-bold text-yellow-500 mb-2 block">1. Aeropuerto</label>
                        <input type="text" name="transferAirportTitle" value={formData.transferAirportTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm mb-2" placeholder="Título" />
                        <textarea name="transferAirportDesc" value={formData.transferAirportDesc || ''} onChange={handleChange} rows={3} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs resize-none" placeholder="Descripción" />
                    </div>

                    {/* Health */}
                    <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <label className="text-xs font-bold text-yellow-500 mb-2 block">2. Centros de Salud</label>
                        <input type="text" name="transferHealthTitle" value={formData.transferHealthTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm mb-2" placeholder="Título" />
                        <textarea name="transferHealthDesc" value={formData.transferHealthDesc || ''} onChange={handleChange} rows={3} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs resize-none" placeholder="Descripción" />
                    </div>

                    {/* Private */}
                    <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <label className="text-xs font-bold text-yellow-500 mb-2 block">3. Privados / Otros</label>
                        <input type="text" name="transferPrivateTitle" value={formData.transferPrivateTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm mb-2" placeholder="Título" />
                        <textarea name="transferPrivateDesc" value={formData.transferPrivateDesc || ''} onChange={handleChange} rows={3} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs resize-none" placeholder="Descripción" />
                    </div>
                </div>
            </div>

            {/* Fleet */}
            <div className="space-y-4">
               <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                 <h3 className="text-yellow-400 font-bold uppercase text-sm flex items-center gap-2">
                    <ImageIcon size={16} /> Flota (Imágenes)
                 </h3>
                 <button type="button" onClick={addFleetItem} className="flex items-center gap-1 text-xs bg-yellow-500 text-black px-3 py-1 rounded font-bold"><Plus size={14} /> Añadir Vehículo</button>
               </div>
               <div className="space-y-6">
                 {formData.fleetItems?.map((item, index) => (
                    <div key={item.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative group">
                        <button type="button" onClick={() => removeFleetItem(index)} className="absolute top-2 right-2 text-red-500 p-2 hover:bg-red-900/30 rounded z-10" title="Borrar vehículo"><Trash2 size={16} /></button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Left: Inputs */}
                           <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Nombre del Modelo</label>
                                    <input type="text" value={item.title || ''} onChange={(e) => handleFleetChange(index, 'title', e.target.value)} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none" placeholder="Ej: Mercedes Clase E" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Descripción</label>
                                    <textarea value={item.description || ''} onChange={(e) => handleFleetChange(index, 'description', e.target.value)} rows={3} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm resize-none focus:border-yellow-500 outline-none" placeholder="Características..." />
                                </div>
                                
                                <div className="space-y-2 pt-2 border-t border-zinc-800">
                                    <div className="flex justify-between items-center">
                                       <label className="text-[10px] text-yellow-500 font-bold uppercase flex items-center gap-1">
                                          <ImageIcon size={10} /> Galería de Fotos
                                       </label>
                                       <button type="button" onClick={() => addFleetImage(index)} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-white flex items-center gap-1"><Plus size={10} /> URL</button>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {(item.images || []).map((imgUrl, imgIdx) => (
                                            <div key={imgIdx} className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-600 w-4">{imgIdx+1}.</span>
                                                <input 
                                                    type="text" 
                                                    value={imgUrl || ''} 
                                                    onChange={(e) => updateFleetImage(index, imgIdx, e.target.value)} 
                                                    className="flex-1 bg-black border border-zinc-700 rounded p-1.5 text-white text-xs font-mono focus:border-yellow-500 outline-none" 
                                                    placeholder="https://..." 
                                                />
                                                <button type="button" onClick={() => removeFleetImage(index, imgIdx)} className="text-zinc-500 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                           </div>
                           
                           {/* Right: Gallery Preview */}
                           <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                                    <PlaySquare size={10} /> Previsualización (Primera Foto)
                                </label>
                                <div className="relative w-full h-48 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700 shadow-inner group-hover:border-yellow-500/50 transition-colors">
                                    {item.images && item.images.length > 0 && item.images[0] ? (
                                        <>
                                            <img src={getPreviewImage(item.images[0])} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60 pointer-events-none"></div>
                                            <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                                                <p className="text-white font-bold text-sm truncate">{item.title || 'Título'}</p>
                                                <p className="text-gray-400 text-[10px] truncate">{item.description || 'Descripción...'}</p>
                                                {item.images.length > 1 && (
                                                    <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded ml-2">+{item.images.length - 1} fotos</span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                                            <ImageIcon size={32} />
                                            <span className="text-xs mt-2">Sin imágenes</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1 overflow-x-auto pb-1 mt-2 h-10">
                                    {(item.images || []).slice(1).map((thumb, idx) => (
                                       thumb ? <img key={idx} src={getPreviewImage(thumb)} className="h-full w-10 object-cover rounded border border-zinc-800 opacity-60" /> : null
                                    ))}
                                </div>
                           </div>
                        </div>
                    </div>
                 ))}
               </div>
            </div>

            {/* Bus / Groups Settings */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-xl bg-zinc-950/50">
               <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                   <Bus size={16} /> Transporte Grupos (Autobús)
               </h3>
               
               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-400">Título</label>
                   <input type="text" name="busTitle" value={formData.busTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
               </div>
               
               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-400">Descripción</label>
                   <textarea name="busDesc" value={formData.busDesc || ''} onChange={handleChange} rows={3} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none resize-none" />
               </div>

               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-400">URL Imagen Autobús</label>
                   <input type="text" name="busImageUrl" value={formData.busImageUrl || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none font-mono text-xs" />
                   {formData.busImageUrl && <img src={getPreviewImage(formData.busImageUrl)} alt="Preview" className="h-24 w-full object-cover rounded border border-zinc-800 opacity-70" />}
               </div>
            </div>

            {/* Contact Settings */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-xl bg-zinc-950/50">
               <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                   <Phone size={16} /> Datos de Contacto
               </h3>
               
               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-400">Título Sección</label>
                   <input type="text" name="contactTitle" value={formData.contactTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone 1 Block */}
                  <div className="space-y-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <label className="text-xs font-bold text-yellow-500 uppercase">Teléfono 1 (Principal)</label>
                      <input 
                         type="text" 
                         name="contactPhone1Label" 
                         value={formData.contactPhone1Label || ''} 
                         onChange={handleChange} 
                         placeholder="Etiqueta (Ej: Oficina)"
                         className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-xs mb-2 focus:border-yellow-500 outline-none" 
                      />
                      <input 
                        type="text" 
                        name="contactPhone1" 
                        value={formData.contactPhone1 || ''} 
                        onChange={handleChange} 
                        placeholder="Número (+34...)"
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none" 
                      />
                  </div>

                  {/* Phone 2 Block */}
                  <div className="space-y-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <label className="text-xs font-bold text-yellow-500 uppercase">Teléfono 2 (Secundario)</label>
                      <input 
                         type="text" 
                         name="contactPhone2Label" 
                         value={formData.contactPhone2Label || ''} 
                         onChange={handleChange} 
                         placeholder="Etiqueta (Ej: Urgencias)"
                         className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-xs mb-2 focus:border-yellow-500 outline-none" 
                      />
                      <input 
                        type="text" 
                        name="contactPhone2" 
                        value={formData.contactPhone2 || ''} 
                        onChange={handleChange} 
                        placeholder="Número (+34...)"
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none" 
                      />
                  </div>
               </div>

               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-400">Email de Contacto</label>
                   <input type="text" name="contactEmail" value={formData.contactEmail || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" />
               </div>

               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-400">Dirección Física (Opcional)</label>
                   <input type="text" name="contactAddress" value={formData.contactAddress || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none" placeholder="Ej: Rúa Real, Caldas de Reis..." />
               </div>
            </div>

            {/* PARTNERS SECTION (New) */}
            <div className="space-y-4 border border-zinc-800 p-4 rounded-xl bg-zinc-950/50">
               <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                 <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                    <Handshake size={16} /> Socios / Empresas
                 </h3>
                 <button type="button" onClick={addPartnerItem} className="flex items-center gap-1 text-xs bg-yellow-500 text-black px-3 py-1 rounded font-bold"><Plus size={14} /> Añadir Socio</button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                       <label className="text-xs font-bold text-zinc-400">Título Sección</label>
                       <input type="text" name="partnersTitle" value={formData.partnersTitle || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-yellow-500 outline-none" />
                  </div>
                   <div className="space-y-2">
                       <label className="text-xs font-bold text-zinc-400">Descripción Corta</label>
                       <input type="text" name="partnersDesc" value={formData.partnersDesc || ''} onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs focus:border-yellow-500 outline-none" />
                  </div>
               </div>

               {/* TEMPLATE SELECTOR */}
               <div className="bg-black border border-zinc-700 p-3 rounded-lg flex items-center justify-between">
                   <div className="flex items-center gap-2 text-zinc-300">
                       <LayoutGrid size={16} className="text-yellow-500" />
                       <span className="text-xs font-bold">Plantilla de Diseño</span>
                   </div>
                   <select 
                      name="partnersTemplate" 
                      value={formData.partnersTemplate || 'scroll'} 
                      onChange={handleChange}
                      className="bg-zinc-900 text-white text-xs border border-zinc-700 rounded p-1.5 focus:border-yellow-500 outline-none"
                   >
                       <option value="scroll">Carrusel Infinito (Animado)</option>
                       <option value="grid">Cuadrícula Estática</option>
                       <option value="cards">Tarjetas Destacadas</option>
                   </select>
               </div>

               <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
                  {(formData.partnerItems || []).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3 bg-zinc-900 p-2 rounded border border-zinc-800">
                          <button type="button" onClick={() => removePartnerItem(index)} className="text-zinc-500 hover:text-red-500"><Trash2 size={14} /></button>
                          
                          <div className="flex-1 space-y-1">
                              <input 
                                type="text" 
                                value={item.name} 
                                onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded p-1 text-white text-xs focus:border-yellow-500 outline-none"
                                placeholder="Nombre Socio"
                              />
                              <input 
                                type="text" 
                                value={item.logoUrl} 
                                onChange={(e) => handlePartnerChange(index, 'logoUrl', e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded p-1 text-zinc-400 text-[10px] font-mono focus:border-yellow-500 outline-none"
                                placeholder="URL Imagen (Dropbox / Web)"
                              />
                          </div>

                          <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center p-1 border border-zinc-700 overflow-hidden">
                              {item.logoUrl ? <img src={getPreviewImage(item.logoUrl)} className="w-full h-full object-cover rounded" /> : <ImageIcon size={16} className="text-zinc-600"/>}
                          </div>
                      </div>
                  ))}
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