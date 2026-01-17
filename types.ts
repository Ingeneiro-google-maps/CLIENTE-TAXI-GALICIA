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
}

export interface BookingConfirmation {
  id: string;
  data: BookingData;
  timestamp: Date;
}