import type { TransportationMode } from "@/lib/constants";

export type { TransportationMode };

// Matches Edward's status enum exactly
export type RoomStatus = "waiting" | "voting" | "completed" | "closed";

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
  category?: string;
}

export interface Participant {
  _id: string;
  userId?: string;
  name: string;
  location: string;
  dietaryRequirements?: string[];
  dietaryNotes?: string;
  preferences?: string;
  transportationMode: TransportationMode;
  isGuest: boolean;
  isAdmin: boolean;
  latitude?: number;
  longitude?: number;
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
  date?: string;
  description?: string;
  createdAt: string;
}

export interface VotePayload {
  participantId: string;
  rankings: string[]; // array of location _id strings
}

export interface VoteStatus {
  hasVoted: boolean;       
  totalVotes: number;     
  totalParticipants: number;
}