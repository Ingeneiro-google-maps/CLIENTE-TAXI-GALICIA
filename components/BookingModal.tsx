import React from 'react';
import { BookingConfirmation, SiteConfig } from '../types';
import { X, MessageCircle, Navigation, Clock, User, Phone, CheckCheck } from 'lucide-react';
import { ASSISTANCE_OPTIONS } from '../constants';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmation: BookingConfirmation | null;
  siteConfig: SiteConfig;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, confirmation, siteConfig }) => {
  if (!isOpen || !confirmation) return null;

  // Logic to show correct destination text
  const destinationText = confirmation.data.destination === 'custom' 
    ? `${confirmation.data.customAddress} (Dirección Exacta)`
    : confirmation.data.destination;

  // Logic to show correct origin text
  const originText = confirmation.data.origin === 'custom' 
    ? `${confirmation.data.customOriginAddress} (Dirección Exacta)`
    : confirmation.data.origin;

  // Map assistance IDs to readable labels
  const assistanceLabels = confirmation.data.assistance.map(id => {
    const option = ASSISTANCE_OPTIONS.find(opt => opt.id === id);
    return option ? option.label : id;
  });

  const assistanceText = assistanceLabels.length > 0 ? assistanceLabels.join(', ') : 'Estándar';

  // --- WhatsApp Message Construction ---
  // Message format designed to be readable at a glance by the driver/central
  const rawMessage = 
    `*NUEVA RESERVA TAXI* 🚕\n` +
    `--------------------------------\n` +
    `📅 *FECHA:* ${confirmation.timestamp.toLocaleDateString()} - ${confirmation.timestamp.toLocaleTimeString().slice(0,5)}\n` +
    `👤 *CLIENTE:* ${confirmation.data.name}\n` +
    `📱 *TELÉFONO:* ${confirmation.data.phone}\n` +
    `--------------------------------\n` +
    `📍 *DESDE:* ${originText}\n`+
    `🏁 *HASTA:* ${destinationText}\n` +
    `--------------------------------\n` +
    `ℹ️ *INFO:* ${assistanceText}\n` +
    `📝 *NOTA:* ${confirmation.data.notes || 'Ninguna'}\n` +
    `--------------------------------\n` +
    `🆔 Ref: ${confirmation.id}`;

  const encodedMessage = encodeURIComponent(rawMessage);
  
  // Logic to Determine Target URL
  // If the admin put a number (e.g. 34600...), we construct the URL.
  // If they put a full URL, we use it.
  const configWhatsapp = siteConfig.whatsappUrl || "";
  let baseUrl = "https://wa.me/message/IWHB27KLZRBFL1"; // Fallback default
  
  if (configWhatsapp.trim() !== "") {
    if (configWhatsapp.startsWith("http")) {
      baseUrl = configWhatsapp;
    } else {
      // Assume it's a raw number
      // Clean any non-numeric chars just in case, except +
      const cleanNumber = configWhatsapp.replace(/[^\d+]/g, '');
      baseUrl = `https://wa.me/${cleanNumber}`;
    }
  }

  // Check separator logic strictly
  const separator = baseUrl.includes('?') ? '&' : '?';
  const finalWhatsappLink = `${baseUrl}${separator}text=${encodedMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-zinc-900 border-t-4 md:border-2 border-green-500 md:rounded-2xl rounded-t-3xl w-full max-w-md shadow-[0_0_50px_rgba(34,197,94,0.3)] overflow-hidden relative flex flex-col max-h-[90vh]">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-black/20 rounded-full p-2 z-20"
        >
          <X size={24} />
        </button>

        {/* Header Visual */}
        <div className="pt-8 pb-4 px-6 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
                <CheckCheck size={40} className="text-black stroke-2" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Datos Listos</h2>
            <p className="text-green-400 font-medium">Confirmar envío a Central</p>
        </div>

        {/* Ticket Details */}
        <div className="px-6 py-2">
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 p-4 space-y-3 relative overflow-hidden">
                {/* Decorative side strip */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>

                <div className="flex items-start gap-3">
                    <User className="text-zinc-500 mt-1" size={16} />
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold">Cliente</p>
                        <p className="text-white font-bold">{confirmation.data.name}</p>
                        <p className="text-zinc-400 text-sm">{confirmation.data.phone}</p>
                    </div>
                </div>

                <div className="w-full border-t border-dashed border-zinc-800 my-2"></div>

                <div className="flex items-start gap-3">
                    <Navigation className="text-zinc-500 mt-1" size={16} />
                    <div className="w-full">
                        <p className="text-xs text-zinc-500 uppercase font-bold">Trayecto</p>
                        <div className="flex justify-between items-center mt-1">
                             <span className="text-yellow-500 font-bold">{originText}</span>
                        </div>
                        <div className="pl-1 border-l-2 border-zinc-800 ml-1 h-3"></div>
                         <div className="flex justify-between items-center">
                             <span className="text-white font-bold">{destinationText}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Big Action Area */}
        <div className="p-6 mt-auto bg-zinc-900 pb-10 md:pb-6">
            <a 
              href={finalWhatsappLink}
              target="_blank"
              rel="noreferrer"
              className="group relative w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white p-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(22,163,74,0.3)] hover:shadow-[0_10px_40px_rgba(22,163,74,0.5)] transform active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse-ring"></div>
              <MessageCircle size={32} className="fill-white text-green-600 z-10" />
              <div className="text-left z-10">
                  <p className="font-black text-lg uppercase leading-none">Confirmar y Enviar</p>
                  <p className="text-green-100 text-xs font-medium">Abrir conversación con Central</p>
              </div>
            </a>
            <p className="text-center text-zinc-600 text-[10px] mt-4 max-w-xs mx-auto">
                Al pulsar, se abrirá WhatsApp con los datos cargados. Solo tienes que enviar el mensaje.
            </p>
        </div>

      </div>
    </div>
  );
};

export default BookingModal;