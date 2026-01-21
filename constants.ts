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
  
  // Video Configuration
  videoUrl: "https://videos.pexels.com/video-files/854671/854671-hd_1920_1080_25fps.mp4", // Fallback
  videoUrlA: "https://www.youtube.com/shorts/l2jH-AXia6o", // Default Slot A (Updated per request)
  videoUrlB: "",
  videoUrlC: "",
  videoUrlD: "",

  whatsappUrl: "https://wa.me/message/IWHB27KLZRBFL1",
  
  // General
  enableAssistant: true,
  geminiApiKey: "", // User must provide this in Admin Panel to fix Domain Errors
  demoMode: false, // Watermark disabled by default

  // Default order: Services -> Transfers -> Bus -> Fleet -> Reservation -> Contact
  sectionOrder: ['services', 'transfers', 'bus', 'fleet', 'reservation', 'contact'],

  // Services Grid
  service1Title: "Camino de Santiago",
  service1Desc: "Servicio especializado para peregrinos. Transporte de mochilas etapa a etapa y traslados de fin de etapa.",
  service2Title: "Aeropuertos y Estaciones",
  service2Desc: "Conexiones directas con Lavacolla (Santiago), Peinador (Vigo) y Alvedro (Coruña). Puntualidad garantizada.",
  service3Title: "Servicio 24 Horas",
  service3Desc: "Disponibles día y noche. Servicios para bodas, eventos, mutuas, rehabilitación y paquetería urgente.",

  // Bus / Groups Section
  busTitle: "Viajes en Autobús y Grupos Grandes",
  busDesc: "No solo te llevamos en taxi. Si necesitas transporte para bodas, excursiones, equipos deportivos o grandes grupos de peregrinos, organizamos viajes en autobús con total comodidad y seguridad. Adaptamos el vehículo al tamaño de tu grupo.",
  busImageUrl: "https://images.pexels.com/photos/385997/pexels-photo-385997.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",

  // Contact Section
  contactTitle: "Contáctanos",
  contactPhone1: "+34 600 000 000",
  contactPhone2: "",
  contactEmail: "info@taxiverocaldas.com",

  // Fleet
  fleetTitle: "Nuestra Flota",
  fleetDesc: "Contamos con vehículos modernos, de alta gama y con todas las comodidades. Seguridad, higiene y confort garantizados en cada trayecto.",
  fleetItems: [
    {
      id: '1',
      title: 'Sedán Premium',
      description: 'Mercedes-Benz Clase E o similar. Máximo confort para viajes largos y traslados ejecutivos.',
      images: [
        'https://www.dropbox.com/scl/fi/r2zkakuz2mhkvnhul7aw8/60e153e8-cfe8-4f0b-adce-0abc060a92e1.JPG?rlkey=idei07s49o8ov76uyhusyyg8h&st=w4e559uf&dl=0',
        'https://www.dropbox.com/scl/fi/0d4cq8p9jrf2kqqh3ov4s/e81d1bd4-0cbb-4489-87ab-c8e8e0992326.JPG?rlkey=dn8bqsstk48a604eod5y8dl0x&st=410piymn&dl=0'
      ]
    },
    {
      id: '2',
      title: 'Monovolumen 7 Plazas',
      description: 'Ideal para grupos de peregrinos o familias con mucho equipaje. Espacio y comodidad.',
      images: [
        'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
      ]
    },
    {
      id: '3',
      title: 'Taxi Estándar',
      description: 'Vehículo híbrido ecológico perfecto para trayectos urbanos y desplazamientos rápidos.',
      images: [
        'https://images.pexels.com/photos/4606344/pexels-photo-4606344.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
      ]
    }
  ],

  // Transfers Detail Section
  transfersTitle: "Algunos de los traslados que realizamos son...",
  transferAirportTitle: "Traslado al aeropuerto",
  transferAirportDesc: "¿Necesitar ir al aeropuerto desde Caldas de Reis? En ese caso, puedes contactar Con Taxi Vero Hermida. Estamos a tu disposición para llevarte o recogerte del aeropuerto con total puntualidad.",
  transferHealthTitle: "Traslado a centros de salud",
  transferHealthDesc: "Ante una situación imprevista, puedes confiar en nuestro servicio de taxi. Te llevamos hasta el hospital más cercano o hasta tu centro de salud habitual, para que el traslado no te suponga un problema.",
  transferPrivateTitle: "Traslados privados",
  transferPrivateDesc: "Para cualquier tipo de traslado en taxi en Caldas de Reis y alrededores, puedes contactar con Taxi Vero Hermida. Te proporcionamos un servicio como taxista completo, llevándote a cualquier destino.",

  // Footer
  footerTitle: "TAXI VERO CALDAS",
  footerText: "Servicio profesional de taxi en Caldas de Reis. Conectamos el Camino de Santiago y aeropuertos con comodidad y seguridad.",
};

// Deprecated: These are now loaded from SiteConfig, but kept for fallback or legacy ref
export const WHATSAPP_LINK = DEFAULT_CONFIG.whatsappUrl;
export const VIDEO_BG_URL = DEFAULT_CONFIG.videoUrl;