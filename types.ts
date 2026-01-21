export interface City {
  id: string;
  name: string;
  x: number; // Percentage coordinate X for map (0-100)
  y: number; // Percentage coordinate Y for map (0-100)
}

export interface BookingData {
  origin: string; // This will hold the city ID OR 'custom'
  customOriginAddress?: string; // Specific address if origin is custom
  destination: string; // This will hold the city ID OR 'custom'
  customAddress?: string; // Specific address if destination is custom
  assistance: string[];
  notes: string;
  // New fields for customer details
  name: string;
  phone: string;
}

export interface BookingConfirmation {
  id: string;
  data: BookingData;
  timestamp: Date;
}

export interface FleetItem {
  id: string;
  title: string;
  description: string;
  images: string[]; // Changed from single imageUrl to array
}

export interface SiteConfig {
  heroTitle: string;
  heroSubtitle: string;
  videoUrl: string; // Legacy/Fallback
  // New Video Slots for Random Rotation
  videoUrlA: string;
  videoUrlB: string;
  videoUrlC: string;
  videoUrlD: string;
  
  whatsappUrl: string;
  
  // New: General Settings
  enableAssistant: boolean; // Toggle for AI Assistant
  geminiApiKey: string; // Custom API Key to fix Domain Errors (1008)
  demoMode: boolean; // Toggle for Demo Watermark

  // Order of sections
  sectionOrder: string[]; 
  // Services Grid
  service1Title: string;
  service1Desc: string;
  service2Title: string;
  service2Desc: string;
  service3Title: string;
  service3Desc: string;
  // New: Transfers Detail Section
  transfersTitle: string;
  transferAirportTitle: string;
  transferAirportDesc: string;
  transferHealthTitle: string;
  transferHealthDesc: string;
  transferPrivateTitle: string;
  transferPrivateDesc: string;
  
  // New: Bus / Groups Section
  busTitle: string;
  busDesc: string;
  busImageUrl: string;

  // New: Contact Section
  contactTitle: string;
  contactPhone1: string;
  contactPhone1Label: string; // Nuevo: Etiqueta (Ej: Oficina)
  contactPhone2: string;
  contactPhone2Label: string; // Nuevo: Etiqueta (Ej: Urgencias)
  contactEmail: string;
  contactAddress: string; // Nuevo: Dirección física

  // New: Fleet Section
  fleetTitle: string;
  fleetDesc: string;
  fleetItems: FleetItem[];
  
  // New: Footer Settings
  footerTitle: string;
  footerText: string;
}