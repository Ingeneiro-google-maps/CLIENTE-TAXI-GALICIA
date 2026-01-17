import { City } from './types';

// Map coordinates are approximate relative percentages for a stylized Galicia map
export const CITIES: City[] = [
  { id: 'coruna', name: 'A Coruña', x: 35, y: 15 },
  { id: 'ferrol', name: 'Ferrol', x: 45, y: 10 },
  { id: 'santiago', name: 'Santiago de Compostela', x: 30, y: 45 },
  { id: 'lugo', name: 'Lugo', x: 70, y: 35 },
  { id: 'pontevedra', name: 'Pontevedra', x: 25, y: 65 },
  { id: 'vigo', name: 'Vigo', x: 22, y: 78 },
  { id: 'ourense', name: 'Ourense', x: 60, y: 70 },
  { id: 'tui', name: 'Tui', x: 25, y: 90 },
  { id: 'finisterre', name: 'Fisterra', x: 5, y: 40 },
  { id: 'ribadeo', name: 'Ribadeo', x: 85, y: 15 },
];

export const ASSISTANCE_OPTIONS = [
  { id: 'wheelchair', label: 'Silla de Ruedas' },
  { id: 'child_seat', label: 'Silla Infantil' },
  { id: 'extra_luggage', label: 'Equipaje Extra' },
  { id: 'pet', label: 'Mascota' },
  { id: 'luxury', label: 'Vehículo VIP' },
];

export const WHATSAPP_LINK = "https://wa.me/message/IWHB27KLZRBFL1";
