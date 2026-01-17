import React from 'react';
import { BookingConfirmation } from '../types';
import { X, CheckCircle, Smartphone } from 'lucide-react';
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
  // Using %0A for line breaks in URL, but we also create a raw version for clipboard
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
    `📅 *Fecha Solicitud:* ${confirmation.timestamp.toLocaleDateString()} ${confirmation.timestamp.toLocaleTimeString()}\n` +
    `--------------------------------\n` +
    `👋 _Hola, me gustaría confirmar esta reserva._`;

  // Encode for URL
  const encodedMessage = encodeURIComponent(rawMessage);
  
  // Construct dynamic WhatsApp Link
  // Check if url already has params
  const separator = whatsappUrl.includes('?') ? '&' : '?';
  const finalLink = `${whatsappUrl}${separator}text=${encodedMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawMessage);
    // Optional: Alert removed to make UX smoother, as button indicates action
    // alert('Mensaje copiado al portapapeles. Pégalo en el chat de WhatsApp.'); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-yellow-500/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-black text-center">
          <div className="mx-auto bg-black/20 w-16 h-16 rounded-full flex items-center justify-center mb-3">
             <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">¡Reserva Iniciada!</h2>
          <p className="font-semibold opacity-80">Su código: {confirmation.id}</p>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-black/50 hover:text-black transition-colors"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-zinc-300">Hemos preparado los datos de su viaje.</p>
            <p className="text-xs text-zinc-500">Pulse el botón para abrir WhatsApp con la información ya escrita.</p>
          </div>

          <div className="bg-black p-4 rounded-lg border border-zinc-800 text-sm font-mono text-zinc-400 break-words text-left">
            <p><span className="text-yellow-500">Origen:</span> {confirmation.data.origin}</p>
            <p><span className="text-yellow-500">Destino:</span> {destinationText}</p>
            <p className="mt-2"><span className="text-yellow-500">Opciones:</span> {assistanceText}</p>
            <p className="mt-2 text-xs border-t border-zinc-800 pt-2 italic">
               "{confirmation.data.notes || 'Sin notas'}"
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a 
              href={finalLink}
              target="_blank"
              rel="noreferrer"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,255,0,0.3)] hover:scale-[1.02]"
            >
              <Smartphone size={20} />
              Enviar Reserva por WhatsApp
            </a>
            <p className="text-[10px] text-center text-zinc-600 max-w-xs mx-auto">
              Si el mensaje no aparece automáticamente, ya lo hemos copiado a su portapapeles. Solo tiene que darle a "Pegar" en el chat.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingModal;