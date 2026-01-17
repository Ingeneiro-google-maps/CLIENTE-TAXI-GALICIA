import React, { useState, useEffect } from 'react';
import { CITIES, ASSISTANCE_OPTIONS, DEFAULT_CONFIG } from './constants';
import { BookingData, BookingConfirmation, SiteConfig } from './types';
import GaliciaMap from './components/GaliciaMap';
import BookingModal from './components/BookingModal';
import AdminPanel from './components/AdminPanel';
import { Car, MapPin, Navigation, Phone, ShieldCheck, Clock, Star, Map, Plane, Briefcase, Backpack, User, Smartphone, Lock, Wifi, Activity, HeartPulse } from 'lucide-react';

const App: React.FC = () => {
  // --- Configuration State ---
  const [config, setConfig] = useState<SiteConfig>(() => {
    const saved = localStorage.getItem('siteConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Fallback for old configs that might not have fleetItems
      if (!parsed.fleetItems) parsed.fleetItems = DEFAULT_CONFIG.fleetItems;
      return parsed;
    }
    return DEFAULT_CONFIG;
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleSaveConfig = (newConfig: SiteConfig) => {
    setConfig(newConfig);
    localStorage.setItem('siteConfig', JSON.stringify(newConfig));
  };

  // --- Booking State ---
  const [bookingData, setBookingData] = useState<BookingData>({
    origin: '',
    destination: '',
    customAddress: '',
    assistance: [],
    notes: '',
    name: '',
    phone: '',
  });

  const [useCustomDest, setUseCustomDest] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Set Caldas de Reis as default origin if available
  useEffect(() => {
    if (!bookingData.origin) {
        setBookingData(prev => ({ ...prev, origin: 'caldas' }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingData(prev => ({ ...prev, [name]: value }));
    
    // Trigger simulation conditions
    if (!useCustomDest && ((name === 'origin' && bookingData.destination) || (name === 'destination' && bookingData.origin))) {
       setSimulationActive(false);
       setTimeout(() => setSimulationActive(true), 100);
    }
  };

  const toggleCustomDest = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isCustom = e.target.checked;
    setUseCustomDest(isCustom);
    setBookingData(prev => ({
      ...prev,
      destination: isCustom ? 'custom' : '',
      customAddress: ''
    }));
    setSimulationActive(false);
  };

  const handleAssistanceToggle = (id: string) => {
    setBookingData(prev => {
      const exists = prev.assistance.includes(id);
      return {
        ...prev,
        assistance: exists 
          ? prev.assistance.filter(a => a !== id)
          : [...prev.assistance, id]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData.name || !bookingData.phone) return;
    if (!bookingData.origin) return;
    if (!useCustomDest && !bookingData.destination) return;
    if (useCustomDest && !bookingData.customAddress) return;

    setSimulationActive(true);
    
    const randomId = 'VERO-' + Math.floor(10000 + Math.random() * 90000);
    const newConfirmation: BookingConfirmation = {
      id: randomId,
      data: { 
        ...bookingData,
        origin: CITIES.find(c => c.id === bookingData.origin)?.name || bookingData.origin,
        destination: useCustomDest 
          ? 'custom' 
          : (CITIES.find(c => c.id === bookingData.destination)?.name || bookingData.destination),
      },
      timestamp: new Date()
    };

    setConfirmation(newConfirmation);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-yellow-500 selection:text-black overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          {/* Key added to force reload when URL changes via admin panel */}
          <video 
            key={config.videoUrl}
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-80"
          >
            <source src={config.videoUrl} type="video/mp4" />
          </video>
        </div>

        {/* Hero Content */}
        <div className="relative z-20 container mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-6 py-2 rounded-full border border-yellow-400 text-yellow-400 text-sm font-bold tracking-widest uppercase bg-black/60 backdrop-blur-md shadow-lg">
            Servicio Oficial Caldas de Reis
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white drop-shadow-2xl uppercase">
            {config.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto font-light drop-shadow-md">
            {config.heroSubtitle}
          </p>
          <a href="#reservation" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(250,204,21,0.5)] flex items-center gap-3 mx-auto w-fit">
            <Car size={24} />
            SOLICITAR TAXI
          </a>
        </div>

        {/* Animated Taxi SVG (Cartoon Style) */}
        <div className="absolute bottom-10 left-0 w-full pointer-events-none z-20 overflow-hidden">
           <div className="animate-drive relative w-80 h-32">
             <svg viewBox="0 0 400 160" className="w-full h-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                {/* Wheels (Back) */}
                <g className="animate-spin" style={{transformOrigin: '85px 125px', animationDuration: '1s'}}>
                  <circle cx="85" cy="125" r="23" fill="#1a1a1a" />
                  <circle cx="85" cy="125" r="14" fill="#d1d5db" stroke="#1a1a1a" strokeWidth="1"/>
                  <path d="M85 111 L85 139 M71 125 L99 125" stroke="#1a1a1a" strokeWidth="2" />
                </g>
                {/* Wheels (Front) */}
                <g className="animate-spin" style={{transformOrigin: '315px 125px', animationDuration: '1s'}}>
                  <circle cx="315" cy="125" r="23" fill="#1a1a1a" />
                  <circle cx="315" cy="125" r="14" fill="#d1d5db" stroke="#1a1a1a" strokeWidth="1"/>
                  <path d="M315 111 L315 139 M301 125 L329 125" stroke="#1a1a1a" strokeWidth="2" />
                </g>
                {/* Car Body Main */}
                <path d="M15 100 Q15 70 50 60 L110 35 L250 35 L340 70 Q380 75 385 100 L385 115 Q385 125 365 125 L345 125 Q345 95 315 95 Q285 95 285 125 L115 125 Q115 95 85 95 Q55 95 55 125 L35 125 Q15 125 15 100 Z" 
                      fill="#F7C948" stroke="#DCA010" strokeWidth="2" />
                {/* Windows */}
                <path d="M120 40 L240 40 L330 70 L120 70 Z" fill="#222" />
                <path d="M190 40 L190 70" stroke="#F7C948" strokeWidth="4" />
                {/* Taxi Sign */}
                <g transform="translate(180, 15)">
                  <rect x="0" y="0" width="60" height="20" rx="3" fill="#F7C948" stroke="#111" strokeWidth="2" />
                  <rect x="5" y="4" width="8" height="6" fill="#111" />
                  <rect x="18" y="10" width="8" height="6" fill="#111" />
                  <rect x="31" y="4" width="8" height="6" fill="#111" />
                  <rect x="44" y="10" width="8" height="6" fill="#111" />
                </g>
                {/* Side Details */}
                <rect x="120" y="80" width="160" height="15" fill="none" />
                <rect x="120" y="80" width="10" height="10" fill="#111" />
                <rect x="130" y="90" width="10" height="5" fill="#111" />
                <rect x="140" y="80" width="10" height="10" fill="#111" />
                <rect x="250" y="90" width="10" height="5" fill="#111" />
                <rect x="260" y="80" width="10" height="10" fill="#111" />
                <rect x="270" y="90" width="10" height="5" fill="#111" />
                <text x="200" y="94" fontSize="22" fontWeight="900" fill="#111" textAnchor="middle" style={{fontFamily: 'Arial, sans-serif'}}>TAXI</text>
                <rect x="200" y="75" width="15" height="4" rx="2" fill="#111" opacity="0.8" />
                <rect x="260" y="75" width="15" height="4" rx="2" fill="#111" opacity="0.8" />
                {/* Lights */}
                <path d="M380 95 L385 105 L370 105 Z" fill="#FFF" opacity="0.9" />
                <path d="M15 90 L10 100 L20 100 Z" fill="#CC0000" />
             </svg>
           </div>
        </div>
      </div>

      {/* --- SERVICES GRID (Dynamic) --- */}
      <div className="bg-black py-20 border-b border-zinc-800">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-12 uppercase">Nuestros <span className="text-yellow-400">Servicios</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             
             {/* Service 1 */}
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 hover:border-yellow-400/50 transition-colors group">
                <Backpack className="w-12 h-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-2">{config.service1Title}</h3>
                <p className="text-gray-400">{config.service1Desc}</p>
             </div>

             {/* Service 2 */}
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 hover:border-yellow-400/50 transition-colors group">
                <Plane className="w-12 h-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-2">{config.service2Title}</h3>
                <p className="text-gray-400">{config.service2Desc}</p>
             </div>

             {/* Service 3 */}
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 hover:border-yellow-400/50 transition-colors group">
                <Clock className="w-12 h-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-2">{config.service3Title}</h3>
                <p className="text-gray-400">{config.service3Desc}</p>
             </div>
          </div>
        </div>
      </div>

      {/* --- NEW SECTION: DETAILED TRANSFERS --- */}
      <div className="bg-zinc-900 py-24 border-b border-zinc-800">
         <div className="container mx-auto px-6">
            <h2 className="text-3xl font-black text-center mb-12 uppercase text-white">
              {config.transfersTitle}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Airport Detail */}
               <div className="flex flex-col items-center text-center p-6 hover:bg-black/30 rounded-2xl transition-colors">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-6 text-black">
                     <Plane size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{config.transferAirportTitle}</h3>
                  <p className="text-gray-400 leading-relaxed">{config.transferAirportDesc}</p>
               </div>

               {/* Health Detail */}
               <div className="flex flex-col items-center text-center p-6 hover:bg-black/30 rounded-2xl transition-colors">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-6 text-black">
                     <HeartPulse size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{config.transferHealthTitle}</h3>
                  <p className="text-gray-400 leading-relaxed">{config.transferHealthDesc}</p>
               </div>

               {/* Private Detail */}
               <div className="flex flex-col items-center text-center p-6 hover:bg-black/30 rounded-2xl transition-colors">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-6 text-black">
                     <ShieldCheck size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{config.transferPrivateTitle}</h3>
                  <p className="text-gray-400 leading-relaxed">{config.transferPrivateDesc}</p>
               </div>
            </div>
         </div>
      </div>

      {/* --- NEW SECTION: FLEET --- */}
      <div className="bg-black py-24 border-b border-zinc-800">
         <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                 <h2 className="text-4xl font-black mb-4 uppercase text-white">
                   {config.fleetTitle}
                 </h2>
                 <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                   {config.fleetDesc}
                 </p>
                 <div className="flex justify-center gap-6 mt-8 text-sm text-gray-400">
                     <div className="flex items-center gap-2"><Wifi className="text-yellow-400" size={16} /> WiFi Gratis</div>
                     <div className="flex items-center gap-2"><ShieldCheck className="text-yellow-400" size={16} /> Seguro Total</div>
                     <div className="flex items-center gap-2"><Briefcase className="text-yellow-400" size={16} /> Maletero XL</div>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {config.fleetItems && config.fleetItems.length > 0 ? (
                 config.fleetItems.map((item) => (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all group">
                       <div className="h-56 overflow-hidden relative">
                         <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800'; // Fallback
                            }}
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60"></div>
                       </div>
                       <div className="p-8">
                          <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                          <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                       </div>
                    </div>
                 ))
               ) : (
                 <p className="text-center w-full text-gray-500">No hay vehículos configurados.</p>
               )}
            </div>
         </div>
      </div>

      {/* --- RESERVATION SECTION --- */}
      <div id="reservation" className="py-24 bg-neutral-900 relative">
        <div className="container mx-auto px-6">
          
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Left Column: Form */}
            <div className="w-full lg:w-1/3">
              <div className="bg-black border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                  <Navigation className="text-yellow-400" /> Pedir Taxi
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Nombre y Apellido</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                        <input
                          type="text"
                          name="name"
                          value={bookingData.name}
                          onChange={handleInputChange}
                          placeholder="Ej: Juan Pérez"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-400"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Teléfono</label>
                      <div className="relative">
                         <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                        <input
                          type="tel"
                          name="phone"
                          value={bookingData.phone}
                          onChange={handleInputChange}
                          placeholder="Ej: 600 123 456"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-400"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Origin */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Punto de Recogida</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                      <select 
                        name="origin" 
                        value={bookingData.origin}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-400 appearance-none"
                        required
                      >
                        <option value="">Selecciona origen</option>
                        {CITIES.map(city => (
                          <option key={city.id} value={city.id} disabled={city.id === bookingData.destination}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Destination Toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                      Destino
                      <label className="flex items-center gap-2 text-xs normal-case font-normal text-yellow-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useCustomDest} 
                          onChange={toggleCustomDest}
                          className="accent-yellow-400 w-4 h-4" 
                        />
                        Dirección exacta / Otra
                      </label>
                    </label>
                    
                    <div className="relative">
                      {useCustomDest ? (
                        <>
                          <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                          <input
                            type="text"
                            name="customAddress"
                            value={bookingData.customAddress}
                            onChange={handleInputChange}
                            placeholder="Ej: Rúa do Franco, 15, Santiago..."
                            className="w-full bg-zinc-900 border border-zinc-700 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-400"
                            required
                          />
                        </>
                      ) : (
                        <>
                          <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                          <select 
                            name="destination" 
                            value={bookingData.destination}
                            onChange={handleInputChange}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-400 appearance-none"
                            required
                          >
                            <option value="">Selecciona destino</option>
                            {CITIES.map(city => (
                              <option key={city.id} value={city.id} disabled={city.id === bookingData.origin}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Assistance */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Opciones</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ASSISTANCE_OPTIONS.map(opt => (
                        <div 
                          key={opt.id}
                          onClick={() => handleAssistanceToggle(opt.id)}
                          className={`cursor-pointer px-3 py-2 rounded-lg border text-sm transition-all text-center flex items-center justify-center ${bookingData.assistance.includes(opt.id) ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-zinc-900 border-zinc-700 text-gray-400 hover:border-gray-500'}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Observaciones</label>
                    <textarea 
                      name="notes"
                      value={bookingData.notes}
                      onChange={handleInputChange}
                      placeholder="Ej: Llevo 3 maletas grandes..."
                      className="w-full bg-zinc-900 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-yellow-400 h-24 resize-none"
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-xl text-lg uppercase tracking-wider transition-all shadow-lg hover:shadow-yellow-400/20"
                  >
                    Confirmar Reserva
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Map */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-bold text-white">Cobertura Galicia</h3>
                   <p className="text-gray-400">Base central en <span className="text-yellow-400 font-bold">Caldas de Reis</span></p>
                </div>
                {simulationActive && (
                  <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span className="text-sm font-bold uppercase">Calculando Ruta en Google Maps</span>
                  </div>
                )}
              </div>
              
              <GaliciaMap 
                originId={bookingData.origin} 
                destinationId={bookingData.destination}
                isSimulating={simulationActive}
                isCustomDestination={useCustomDest}
                customAddress={bookingData.customAddress}
              />
            </div>

          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-black border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl font-black text-white mb-2">TAXI <span className="text-yellow-400">VERO CALDAS</span></h2>
          <p className="text-zinc-500 mb-6 max-w-md mx-auto">Servicio profesional de taxi en Caldas de Reis. Conectamos el Camino de Santiago y aeropuertos con comodidad y seguridad.</p>
          
          <div className="flex justify-center gap-6 mb-8 text-gray-400 text-sm">
             <span className="hover:text-yellow-400 transition-colors cursor-pointer">Caldas de Reis</span>
             <span className="hover:text-yellow-400 transition-colors cursor-pointer">Santiago de Compostela</span>
             <span className="hover:text-yellow-400 transition-colors cursor-pointer">Vigo</span>
          </div>
          <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Taxi Vero Caldas. Todos los derechos reservados.</p>
          <div className="mt-4 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-zinc-600 text-xs">
               <Phone size={12} /> Atención preferente por WhatsApp
            </div>
            
            {/* HIDDEN ADMIN PADLOCK */}
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="text-zinc-800 hover:text-yellow-400 transition-colors p-2"
              aria-label="Admin Login"
            >
               <Lock size={14} />
            </button>
          </div>
        </div>
      </footer>

      {/* Confirmation Modal */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        confirmation={confirmation} 
        whatsappUrl={config.whatsappUrl}
      />

      {/* Admin Panel Modal */}
      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        currentConfig={config}
        onSave={handleSaveConfig}
      />
      
    </div>
  );
};

export default App;