export interface City {
  id: string;
  name: string;
  x: number; // Percentage coordinate X for map (0-100)
  y: number; // Percentage coordinate Y for map (0-100)
}

export interface BookingData {
  origin: string;
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

export interface SiteConfig {
  heroTitle: string;
  heroSubtitle: string;
  videoUrl: string;
  whatsappUrl: string;
  service1Title: string;
  service1Desc: string;
  service2Title: string;
  service2Desc: string;
  service3Title: string;
  service3Desc: string;
}