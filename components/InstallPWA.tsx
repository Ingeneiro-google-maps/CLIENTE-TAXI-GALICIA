import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return; 
    }

    // 2. Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 3. Handle Android/Chrome Install Prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-show modal on mobile devices
      if (window.innerWidth < 1024) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. Handle iOS - Auto show instruction if mobile
    if (isIosDevice && window.innerWidth < 1024) {
       // Check session storage to avoid annoyance, OR remove this check to be very aggressive
       if (!sessionStorage.getItem('ios_prompt_shown')) {
         setTimeout(() => setIsVisible(true), 2000); // Small delay for effect
         sessionStorage.setItem('ios_prompt_shown', 'true');
       }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const closePrompt = () => {
    setIsVisible(false);
  };

  // If installed or not visible, don't render
  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in-up">
      <div className="bg-zinc-900 border-2 border-yellow-400 rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden">
        
        {/* Header Visual */}
        <div className="bg-yellow-400 p-6 flex flex-col items-center justify-center text-center">
            <div className="bg-black text-yellow-400 p-4 rounded-full mb-3 shadow-lg">
                <Smartphone size={40} />
            </div>
            <h3 className="font-black text-2xl text-black uppercase leading-tight">Instalar App Taxi</h3>
            <p className="text-black/80 font-semibold text-sm mt-1">Para una mejor experiencia</p>
        </div>

        <button 
          onClick={closePrompt}
          className="absolute top-4 right-4 text-black/50 hover:text-black bg-white/20 rounded-full p-1"
        >
          <X size={20} />
        </button>

        <div className="p-6 flex flex-col gap-6">
          <div className="space-y-3 text-center">
             <div className="flex items-center gap-3 text-zinc-300 text-sm bg-black/50 p-3 rounded-lg border border-zinc-800">
                <CheckCircle size={16} className="text-green-500 shrink-0" />
                <span>Reserva más rápido</span>
             </div>
             <div className="flex items-center gap-3 text-zinc-300 text-sm bg-black/50 p-3 rounded-lg border border-zinc-800">
                <CheckCircle size={16} className="text-green-500 shrink-0" />
                <span>Sin descargas pesadas</span>
             </div>
          </div>

          {isIOS ? (
             <div className="bg-zinc-800 p-4 rounded-xl text-sm text-zinc-300 border border-zinc-700 text-center animate-pulse">
               <p className="mb-2 font-bold text-white">Instrucciones iPhone:</p>
               <p>1. Pulsa el botón <strong>Compartir</strong> <span className="inline-block border border-zinc-500 px-1 mx-1 rounded bg-zinc-700">⎋</span></p>
               <p>2. Selecciona <strong>"Añadir a inicio"</strong>.</p>
             </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleInstallClick}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.4)] animate-pulse"
              >
                <Download size={24} />
                INSTALAR AHORA
              </button>
              <button 
                onClick={closePrompt}
                className="text-zinc-500 text-xs hover:text-white mt-2"
              >
                Continuar en el navegador
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;