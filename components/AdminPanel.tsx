import React, { useState, useEffect } from 'react';
import { SiteConfig } from '../types';
import { X, Save, RotateCcw, Lock } from 'lucide-react';
import { DEFAULT_CONFIG } from '../constants';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SiteConfig;
  onSave: (config: SiteConfig) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
  const [formData, setFormData] = useState<SiteConfig>(currentConfig);

  // Sync internal state if currentConfig changes
  useEffect(() => {
    setFormData(currentConfig);
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de restablecer los valores originales?')) {
      setFormData(DEFAULT_CONFIG);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
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
                <p className="text-xs text-zinc-400">Edita la información visible del sitio web</p>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="admin-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* General Settings */}
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

            {/* Services */}
            <div className="space-y-4">
              <h3 className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-zinc-800 pb-2">Servicios (Textos)</h3>
              
              {/* Service 1 */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Servicio 1: Título</label>
                    <input 
                      type="text" 
                      name="service1Title" 
                      value={formData.service1Title} 
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Servicio 1: Descripción</label>
                    <textarea 
                      name="service1Desc" 
                      value={formData.service1Desc} 
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none resize-none"
                    />
                 </div>
              </div>

              {/* Service 2 */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Servicio 2: Título</label>
                    <input 
                      type="text" 
                      name="service2Title" 
                      value={formData.service2Title} 
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Servicio 2: Descripción</label>
                    <textarea 
                      name="service2Desc" 
                      value={formData.service2Desc} 
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none resize-none"
                    />
                 </div>
              </div>

              {/* Service 3 */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Servicio 3: Título</label>
                    <input 
                      type="text" 
                      name="service3Title" 
                      value={formData.service3Title} 
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white focus:border-yellow-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400">Servicio 3: Descripción</label>
                    <textarea 
                      name="service3Desc" 
                      value={formData.service3Desc} 
                      onChange={handleChange}
                      rows={2}
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
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Save size={18} /> Guardar Cambios
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;