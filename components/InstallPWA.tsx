import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Handle Android/Desktop Chrome prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if mobile width to avoid annoying desktop users, or show always as requested
      if (window.innerWidth < 1024) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS hint if mobile
    if (isIosDevice && window.innerWidth < 1024) {
       // Only show once per session
       if (!sessionStorage.getItem('ios_prompt_shown')) {
         setIsVisible(true);
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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in-up">
      <div className="bg-zinc-900 border border-yellow-500 rounded-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] p-5 relative overflow-hidden">
        
        <button 
          onClick={closePrompt}
          className="absolute top-2 right-2 text-zinc-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-yellow-400 p-3 rounded-xl text-black">
                <Smartphone size={32} />
             </div>
             <div>
               <h3 className="font-bold text-lg text-white">Instalar App Taxi</h3>
               <p className="text-zinc-400 text-sm">¿Quiere instalar este aplicativo de taxi en su escritorio?</p>
             </div>
          </div>

          {isIOS ? (
             <div className="bg-black/30 p-3 rounded-lg text-xs text-zinc-400 border border-zinc-800">
               <p>Para instalar en iOS: Pulsa el botón <strong>Compartir</strong> <span className="inline-block border border-zinc-600 px-1 rounded">⎋</span> y selecciona <strong>"Añadir a inicio"</strong>.</p>
             </div>
          ) : (
            <div className="flex gap-3 mt-2">
              <button 
                onClick={closePrompt}
                className="flex-1 py-3 rounded-xl font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                Ahora no
              </button>
              <button 
                onClick={handleInstallClick}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={18} />
                Instalar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;