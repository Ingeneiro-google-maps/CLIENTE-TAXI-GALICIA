import React, { useMemo } from 'react';
import { CITIES } from '../constants';
import { MapPin } from 'lucide-react';

interface GaliciaMapProps {
  originId: string;
  destinationId: string;
  isSimulating: boolean;
  isCustomDestination: boolean;
  customAddress?: string;
}

const GaliciaMap: React.FC<GaliciaMapProps> = ({ 
  originId, 
  destinationId, 
  isSimulating, 
  isCustomDestination,
  customAddress 
}) => {
  
  const mapUrl = useMemo(() => {
    const originCity = CITIES.find(c => c.id === originId);
    const destCity = CITIES.find(c => c.id === destinationId);
    
    // Base URL for Google Maps Embed
    const baseUrl = "https://maps.google.com/maps";

    if (isSimulating && originCity) {
      // Determine destination string
      let destinationQuery = "";
      
      if (isCustomDestination && customAddress) {
        destinationQuery = customAddress;
      } else if (destCity) {
        destinationQuery = destCity.name + ", Galicia, Spain";
      }

      if (destinationQuery) {
        // Mode: Directions (saddr = Source Address, daddr = Destination Address)
        const saddr = encodeURIComponent(originCity.name + ", Galicia, Spain");
        const daddr = encodeURIComponent(destinationQuery);
        return `${baseUrl}?saddr=${saddr}&daddr=${daddr}&output=embed&t=m`; // t=m for standard map
      }
    }

    // Default View: Centered on Caldas de Reis (Base) or Galicia General
    const center = encodeURIComponent("Caldas de Reis, Pontevedra, España");
    return `${baseUrl}?q=${center}&z=10&output=embed&t=m`;

  }, [originId, destinationId, isSimulating, isCustomDestination, customAddress]);

  return (
    <div className="relative w-full h-[500px] md:h-[700px] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700 shadow-2xl group">
      {/* Google Maps Iframe */}
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} // Dark mode hack for iframe
        loading="lazy"
        allowFullScreen
        src={mapUrl}
        title="Google Map Galicia"
        className="absolute inset-0 w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-300"
      ></iframe>

      {/* Overlay info when map is loading or static */}
      <div className="absolute top-4 right-4 bg-black/90 backdrop-blur-md p-3 rounded-lg border border-zinc-700 z-10 shadow-xl pointer-events-none">
        <div className="flex items-center gap-2">
           <MapPin className="text-red-500 w-4 h-4 animate-bounce" />
           <div>
             <h4 className="text-white text-xs font-bold">Google Maps Live</h4>
             <p className="text-zinc-400 text-[10px]">
               {isSimulating ? "Mostrando ruta estimada" : "Vista general de la zona"}
             </p>
           </div>
        </div>
      </div>

      {/* Frame overlay to blend with dark theme */}
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/10 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
    </div>
  );
};

export default GaliciaMap;
