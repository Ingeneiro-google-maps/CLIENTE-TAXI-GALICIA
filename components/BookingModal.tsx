import React from 'react';
import { BookingConfirmation } from '../types';
import { X, CheckCircle, Smartphone, Send } from 'lucide-react';
import { ASSISTANCE_OPTIONS } from '../constants';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmation: BookingConfirmation | null;
  whatsappUrl: string;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, confirmation, whatsappUrl }) => {
  if (!isOpen || !confirmation) return null;

  // Logic to show correct destination text
  const destinationText = confirmation.data.destination === 'custom' 
    ? `${confirmation.data.customAddress} (Dirección Exacta)`
    : confirmation.data.destination;

  // Map assistance IDs to readable labels
  const assistanceLabels = confirmation.data.assistance.map(id => {
    const option = ASSISTANCE_OPTIONS.find(opt => opt.id === id);
    return option ? option.label : id;
  });

  const assistanceText = assistanceLabels.length > 0 ? assistanceLabels.join(', ') : 'Ninguna';

  // Construct the message with all details
  const rawMessage = 
    `🚕 *NUEVA RESERVA TAXI GALICIA*\n` +
    `🆔 *ID Reserva:* ${confirmation.id}\n` +
    `--------------------------------\n` +
    `👤 *Cliente:* ${confirmation.data.name}\n` +
    `📱 *Tel:* ${confirmation.data.phone}\n` +
    `📍 *Origen:* ${confirmation.data.origin}\n` +
    `🏁 *Destino:* ${destinationText}\n` +
    `♿ *Asistencia:* ${assistanceText}\n` +
    `📝 *Notas:* ${confirmation.data.notes || 'Sin notas adicionales'}\n` +
    `📅 *Fecha:* ${confirmation.timestamp.toLocaleDateString()} ${confirmation.timestamp.toLocaleTimeString()}\n` +
    `--------------------------------\n` +
    `👋 _Hola, confirmo mi reserva._`;

  // Encode for URL
  const encodedMessage = encodeURIComponent(rawMessage);
  
  // CRITICAL: Ensure we use the provided link or fallback to the specific hardcoded one
  const targetUrl = (whatsappUrl && whatsappUrl.trim() !== '') 
    ? whatsappUrl 
    : "https://wa.me/message/IWHB27KLZRBFL1";

  // Construct dynamic WhatsApp Link
  // Check if url already has params (some short links like wa.me/message/XYZ might not, but api links might)
  const separator = targetUrl.includes('?') ? '&' : '?';
  const finalLink = `${targetUrl}${separator}text=${encodedMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawMessage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-zinc-900 border-2 border-yellow-500 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-yellow-500 p-6 text-black text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-yellow-400 opacity-50 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/40 to-transparent"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-black text-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg">
               <CheckCircle size={32} strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Reserva Lista</h2>
            <p className="font-bold opacity-80 text-sm">ID: {confirmation.id}</p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-black rounded-full p-2 transition-colors z-20"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-white text-lg font-bold">¡Casi hemos terminado!</p>
            <p className="text-zinc-400 text-sm mt-1">Envía los datos a nuestra central para confirmar el conductor.</p>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 text-sm font-mono text-zinc-300 break-words shadow-inner">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2 mb-2">
                <span className="text-yellow-500 font-bold">Origen</span>
                <span className="text-right max-w-[60%]">{confirmation.data.origin}</span>
            </div>
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2 mb-2">
                <span className="text-yellow-500 font-bold">Destino</span>
                <span className="text-right max-w-[60%]">{destinationText}</span>
            </div>
             <div className="flex justify-between items-start">
                <span className="text-yellow-500 font-bold">Cliente</span>
                <span className="text-right">{confirmation.data.name}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a 
              href={finalLink}
              target="_blank"
              rel="noreferrer"
              onClick={handleCopy}
              className="group flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-black py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(22,163,74,0.4)] hover:shadow-[0_0_30px_rgba(22,163,74,0.6)] hover:-translate-y-1 active:scale-95"
            >
              <Smartphone size={24} className="group-hover:animate-bounce" />
              <span className="text-lg uppercase tracking-wide">Enviar a Central</span>
              <Send size={20} className="opacity-60" />
            </a>
            
            <p className="text-[10px] text-center text-zinc-600 max-w-xs mx-auto">
              Al pulsar, se abrirá WhatsApp con los datos de tu viaje ya escritos. Solo tienes que darle a enviar.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingModal;