import React from 'react';
import { BookingConfirmation } from '../types';
import { WHATSAPP_LINK } from '../constants';
import { X, CheckCircle, Smartphone } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmation: BookingConfirmation | null;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, confirmation }) => {
  if (!isOpen || !confirmation) return null;

  // Construct the message
  const message = `🚕 *NUEVA RESERVA TAXI GALICIA* %0A` +
    `🆔 *ID Reserva:* ${confirmation.id} %0A` +
    `📍 *Origen:* ${confirmation.data.origin} %0A` +
    `🏁 *Destino:* ${confirmation.data.destination} %0A` +
    `♿ *Asistencia:* ${confirmation.data.assistance.length > 0 ? confirmation.data.assistance.join(', ') : 'Ninguna'} %0A` +
    `📝 *Notas:* ${confirmation.data.notes || 'Sin notas adicionales'} %0A` +
    `📅 *Fecha Solicitud:* ${confirmation.timestamp.toLocaleDateString()} %0A` +
    `%0A👋 _Hola, me gustaría confirmar esta reserva._`;

  // Determine URL
  // The provided link is a specific message link. We can try to append text, but it depends on the link type.
  // Standard WA API: https://wa.me/<number>?text=<encoded_text>
  // Provided link: https://wa.me/message/IWHB27KLZRBFL1
  // We will provide a copy button and a direct link button.
  
  // For the sake of the demo, we will create a link that includes the text if possible, 
  // or instruct the user to paste it. 
  // Since we don't have the underlying number for the shortlink, we'll try to open the shortlink directly.
  
  const handleCopy = () => {
    const rawMessage = message.replace(/%0A/g, '\n').replace(/\*/g, '').replace(/_/g, '');
    navigator.clipboard.writeText(rawMessage);
    alert('Mensaje copiado al portapapeles. Pégalo en el chat de WhatsApp.');
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
            <p className="text-zinc-300">Para finalizar su reserva, por favor envíe los detalles generados a nuestro WhatsApp oficial.</p>
          </div>

          <div className="bg-black p-4 rounded-lg border border-zinc-800 text-sm font-mono text-zinc-400 break-words">
            <p><span className="text-yellow-500">Origen:</span> {confirmation.data.origin}</p>
            <p><span className="text-yellow-500">Destino:</span> {confirmation.data.destination}</p>
            <p><span className="text-yellow-500">ID:</span> {confirmation.id}</p>
          </div>

          <div className="flex flex-col gap-3">
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,255,0,0.3)] hover:scale-[1.02]"
            >
              <Smartphone size={20} />
              Confirmar en WhatsApp
            </a>
            <p className="text-xs text-center text-zinc-500">
              *Se copiarán los datos automáticamente al pulsar el botón.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingModal;
