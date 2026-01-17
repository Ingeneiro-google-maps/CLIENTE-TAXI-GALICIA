import React, { useState } from 'react';
import { CITIES, ASSISTANCE_OPTIONS } from './constants';
import { BookingData, BookingConfirmation } from './types';
import GaliciaMap from './components/GaliciaMap';
import BookingModal from './components/BookingModal';
import { Car, MapPin, Navigation, Phone, ShieldCheck, Clock, Star } from 'lucide-react';

const App: React.FC = () => {
  const [bookingData, setBookingData] = useState<BookingData>({
    origin: '',
    destination: '',
    assistance: [],
    notes: '',
  });

  const [simulationActive, setSimulationActive] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingData(prev => ({ ...prev, [name]: value }));
    
    // Trigger simulation if both cities are selected
    if ((name === 'origin' && bookingData.destination) || (name === 'destination' && bookingData.origin)) {
       // Just a visual trigger delay
       setSimulationActive(false);
       setTimeout(() => setSimulationActive(true), 100);
    }
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
    if (!bookingData.origin || !bookingData.destination) return;

    // Simulate Simulating Route for a second before confirming
    setSimulationActive(true);
    
    const randomId = 'TAX-' + Math.floor(10000 + Math.random() * 90000);
    const newConfirmation: BookingConfirmation = {
      id: randomId,
      data: { 
        ...bookingData,
        origin: CITIES.find(c => c.id === bookingData.origin)?.name || bookingData.origin,
        destination: CITIES.find(c => c.id === bookingData.destination)?.name || bookingData.destination,
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
        {/* Replaced Video Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1549557088-7e38466136be?q=80&w=2574&auto=format&fit=crop" 
            alt="Taxi Background"
            className="w-full h-full object-cover"
          />
          {/* Note: Video tags are heavy, using high quality image for instant reliability in generated code, 
              but here is the markup for video if user wants to swap src:
          <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-50">
            <source src="URL_TO_VIDEO.mp4" type="video/mp4" />
          </video> 
          */}
        </div>

        {/* Hero Content */}
        <div className="relative z-20 container mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-4 py-1 rounded-full border border-yellow-400 text-yellow-400 text-sm font-bold tracking-widest uppercase">
            Servicio Premium Galicia
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white">
            TU VIAJE, <span className="text-yellow-400">NUESTRA META</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto font-light">
            Reserva tu taxi profesional en segundos. Cobertura total en Galicia con seguimiento en tiempo real.
          </p>
          <a href="#reservation" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(250,204,21,0.5)] flex items-center gap-3 mx-auto w-fit">
            <Car size={24} />
            RESERVAR AHORA
          </a>
        </div>

        {/* Animated Taxi */}
        <div className="absolute bottom-20 left-0 w-full pointer-events-none z-10 overflow-hidden">
           <div className="animate-drive flex items-center gap-2">
             <div className="w-16 h-8 bg-yellow-400 rounded-t-lg relative shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 w-8 h-2 bg-black rounded-t-sm text-[8px] text-white flex items-center justify-center font-bold">TAXI</div>
                <div className="flex justify-between px-2 mt-1">
                   <div className="w-4 h-3 bg-black/80 rounded-sm"></div>
                   <div className="w-4 h-3 bg-black/80 rounded-sm"></div>
                </div>
                <div className="absolute bottom-0 w-full flex justify-between px-1">
                  <div className="w-3 h-3 bg-black rounded-full -mb-1.5 animate-spin"></div>
                  <div className="w-3 h-3 bg-black rounded-full -mb-1.5 animate-spin"></div>
                </div>
             </div>
             <div className="h-0.5 w-24 bg-gradient-to-r from-yellow-400/0 to-yellow-400"></div>
           </div>
        </div>
      </div>

      {/* --- FEATURES GRID --- */}
      <div className="bg-black py-20 border-b border-zinc-800">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
           <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 hover:border-yellow-400/50 transition-colors group">
              <ShieldCheck className="w-12 h-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Seguridad Garantizada</h3>
              <p className="text-gray-400">Conductores profesionales verificados y vehículos de alta gama desinfectados.</p>
           </div>
           <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 hover:border-yellow-400/50 transition-colors group">
              <Clock className="w-12 h-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Puntualidad Absoluta</h3>
              <p className="text-gray-400">Llegamos a tiempo, siempre. Sistema de seguimiento en tiempo real.</p>
           </div>
           <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 hover:border-yellow-400/50 transition-colors group">
              <Star className="w-12 h-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Experiencia Premium</h3>
              <p className="text-gray-400">Atención personalizada, asistencia especial y confort máximo en cada viaje.</p>
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
                  <Navigation className="text-yellow-400" /> Reserva tu Ruta
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
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

                  {/* Destination */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Destino</label>
                    <div className="relative">
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
                    </div>
                  </div>

                  {/* Assistance */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Asistencia y Extras</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ASSISTANCE_OPTIONS.map(opt => (
                        <div 
                          key={opt.id}
                          onClick={() => handleAssistanceToggle(opt.id)}
                          className={`cursor-pointer px-3 py-2 rounded-lg border text-sm transition-all text-center ${bookingData.assistance.includes(opt.id) ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-zinc-900 border-zinc-700 text-gray-400 hover:border-gray-500'}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Solicitudes Especiales</label>
                    <textarea 
                      name="notes"
                      value={bookingData.notes}
                      onChange={handleInputChange}
                      placeholder="Escribe aquí si necesitas algo más..."
                      className="w-full bg-zinc-900 border border-zinc-700 text-white p-4 rounded-xl focus:outline-none focus:border-yellow-400 h-24 resize-none"
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-xl text-lg uppercase tracking-wider transition-all shadow-lg hover:shadow-yellow-400/20"
                  >
                    Confirmar Viaje
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Map */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-bold text-white">Mapa en Tiempo Real</h3>
                   <p className="text-gray-400">Visualización de ruta estimada</p>
                </div>
                {simulationActive && (
                  <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span className="text-sm font-bold uppercase">Simulando Ruta</span>
                  </div>
                )}
              </div>
              
              <GaliciaMap 
                originId={bookingData.origin} 
                destinationId={bookingData.destination}
                isSimulating={simulationActive}
              />
            </div>

          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-black border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl font-black text-white mb-4">TAXI GALICIA <span className="text-yellow-400">PRO</span></h2>
          <div className="flex justify-center gap-6 mb-8 text-gray-400">
             <a href="#" className="hover:text-yellow-400 transition-colors">Términos</a>
             <a href="#" className="hover:text-yellow-400 transition-colors">Privacidad</a>
             <a href="#" className="hover:text-yellow-400 transition-colors">Contacto</a>
          </div>
          <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} Taxi Galicia. Todos los derechos reservados.</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-zinc-700 text-xs">
            <Phone size={12} /> Soporte 24/7
          </div>
        </div>
      </footer>

      {/* Confirmation Modal */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        confirmation={confirmation} 
      />
      
    </div>
  );
};

export default App;
