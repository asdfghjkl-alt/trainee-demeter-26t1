import mongoose, { models, Schema, Document } from "mongoose";
import { TRANSPORTATION_MODES, TransportationMode } from "@/lib/constants";

export interface ILocation {
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
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
  description?: string;
  createdAt: Date; // The time when the room was created
}

const locationSchema = new Schema<ILocation>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String },
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
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Room = models.Room || mongoose.model<IRoom>("Room", roomSchema);

export default Room;
