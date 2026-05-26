import mongoose, { models, Schema, Document } from "mongoose";
import { TRANSPORTATION_MODES, TransportationMode } from "@/lib/constants";

export interface ILocation {
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
  category?: string;
  addedByAdmin?: boolean;
}

export interface IParticipant {
  userId: mongoose.Types.ObjectId | null;
  name: string;
  location: string;
  dietaryRequirements: string[];
  dietaryNotes?: string;
  preferences: string;
  transportationMode: TransportationMode;
  isGuest: boolean;
  isAdmin: boolean;
  joinedAt?: Date;
  latitude?: number;
  longitude?: number;
  willingness?: "low" | "medium" | "high";
}

export interface IRoom extends Document {
  name: string; // The user-provided name for the room
  code: string; // The code used to join the room
  adminUser: mongoose.Types.ObjectId;
  participants: IParticipant[];
  categories: mongoose.Types.ObjectId[];
  locations: ILocation[];
  status: "waiting" | "voting" | "completed" | "closed";
  date?: Date;
  meetingDirection?: "to-venue" | "from-venue";
  description?: string;
  winners?: mongoose.Types.ObjectId[];
  voteBreakdown?: Record<string, number>;
  travelBudgetMinutes?: number; // Isochrone time budget per participant (1–120, default 20)
  algorithmNotices?: string[];
  hasGeneratedLocations?: boolean;
  createdAt: Date; // The time when the room was created
  country?: string;
}

const locationSchema = new Schema<ILocation>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  addedByAdmin: { type: Boolean, default: false },
});

const participantSchema = new Schema<IParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    dietaryRequirements: [{ type: String }],
    dietaryNotes: { type: String, default: "" },
    preferences: { type: String, default: "" },
    transportationMode: {
      type: String,
      enum: TRANSPORTATION_MODES,
      required: true,
    },
    isGuest: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    latitude: { type: Number },
    longitude: { type: Number },
    willingness: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  { _id: true },
);

const roomSchema = new Schema<IRoom>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  adminUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  participants: { type: [participantSchema], default: [] },
  categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  locations: [locationSchema],
  status: {
    type: String,
    enum: ["waiting", "voting", "completed", "closed"],
    default: "waiting",
  },
  date: { type: Date },
  meetingDirection: {
    type: String,
    enum: ["to-venue", "from-venue"],
    default: "to-venue"
  },
  description: { type: String },
  winners: [{ type: Schema.Types.ObjectId }],
  voteBreakdown: { type: Schema.Types.Map, of: Number, default: {} },
  travelBudgetMinutes: { type: Number, default: 20, min: 1, max: 120 },
  algorithmNotices: [{ type: String }],
  hasGeneratedLocations: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  country: { type: String, default: "au" },
});

const Room = models.Room || mongoose.model<IRoom>("Room", roomSchema);

export default Room;
