// types/room.ts

export type TransportationMode = "driving" | "transit" | "walking" | "cycling";

// Matches Edward's status enum exactly
export type RoomStatus = "open" | "closed" | "ended";

// Matches Edward's Category schema
export interface Category {
  _id: string;
  name: string;
}

export interface Location {
  _id?: string;
  name: string;
  description: string;   
  latitude: number;
  longitude: number;     
  addedByAdmin?: boolean;
}

export interface Participant {
  _id: string;
  userId?: string;
  name: string;
  location: string;
  dietaryRequirements?: string;
  preferences?: string;
  transportationMode: TransportationMode;
  isGuest: boolean;
  isAdmin: boolean;
}

export interface Room {
  _id: string;
  name: string;          
  code: string;
  adminUser: string;      
  participants: Participant[];  
  categories: Category[];      
  locations: Location[];
  status: RoomStatus;    
  createdAt: string;
}