import { City, SiteConfig } from './types';

export const CITIES: City[] = [
  // HQ
  { id: 'caldas', name: 'Caldas de Reis (Base)', x: 30, y: 56 }, // Calculated based on Pontevedra/Santiago

  // Airports / Transport Hubs
  { id: 'scq', name: 'Aeropuerto Santiago (SCQ)', x: 38, y: 46 },
  { id: 'vgo', name: 'Aeropuerto Vigo (VGO)', x: 28, y: 76 },
  { id: 'lco', name: 'Aeropuerto Coruña (LCG)', x: 34, y: 30 },

  // Key Cities
  { id: 'coruna', name: 'A Coruña', x: 32, y: 28 },
  { id: 'santiago', name: 'Santiago de Compostela', x: 34, y: 48 },
  { id: 'pontevedra', name: 'Pontevedra', x: 28, y: 62 },
  { id: 'vigo', name: 'Vigo', x: 25, y: 75 },
  { id: 'vilagacia', name: 'Vilagarcía de Arousa', x: 22, y: 55 },
  { id: 'padron', name: 'Padrón', x: 30, y: 52 },
  { id: 'cambados', name: 'Cambados', x: 18, y: 58 },
  { id: 'sanxenxo', name: 'Sanxenxo', x: 20, y: 64 },
  { id: 'ogrove', name: 'O Grove', x: 15, y: 60 },
  
  // Others
  { id: 'lugo', name: 'Lugo', x: 62, y: 38 },
  { id: 'ourense', name: 'Ourense', x: 52, y: 68 },
  { id: 'tui', name: 'Tui', x: 27, y: 84 },
  { id: 'finisterre', name: 'Fisterra', x: 10, y: 38 },
].sort((a, b) => a.name.localeCompare(b.name));

export const ASSISTANCE_OPTIONS = [
  { id: 'backpack', label: 'Mochilas (Camino)' },
  { id: 'airport', label: 'Recogida Aeropuerto' },
  { id: 'child_seat', label: 'Silla Infantil/Bebé' },
  { id: 'medical', label: 'Cita Médica/Mutua' },
  { id: 'pet', label: 'Mascota' },
  { id: 'events', label: 'Bodas/Eventos' },
];

export const DEFAULT_CONFIG: SiteConfig = {
  heroTitle: "TAXI VERO CALDAS",
  heroSubtitle: "Tu taxi de confianza 24H. Especialistas en el Camino de Santiago, traslados a aeropuertos y servicios a mutuas.",
  videoUrl: "https://videos.pexels.com/video-files/854671/854671-hd_1920_1080_25fps.mp4",
  whatsappUrl: "https://wa.me/message/IWHB27KLZRBFL1",
  service1Title: "Camino de Santiago",
  service1Desc: "Servicio especializado para peregrinos. Transporte de mochilas etapa a etapa y traslados de fin de etapa.",
  service2Title: "Aeropuertos y Estaciones",
  service2Desc: "Conexiones directas con Lavacolla (Santiago), Peinador (Vigo) y Alvedro (Coruña). Puntualidad garantizada.",
  service3Title: "Servicio 24 Horas",
  service3Desc: "Disponibles día y noche. Servicios para bodas, eventos, mutuas, rehabilitación y paquetería urgente.",
};

// Deprecated: These are now loaded from SiteConfig, but kept for fallback or legacy ref
export const WHATSAPP_LINK = DEFAULT_CONFIG.whatsappUrl;
export const VIDEO_BG_URL = DEFAULT_CONFIG.videoUrl;