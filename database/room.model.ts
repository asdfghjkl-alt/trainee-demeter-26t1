import mongoose, { models, Schema, Document } from "mongoose";

export interface ILocation {
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
}

export interface IRoom extends Document {
  code: string; // The code used to join the room
  adminUser: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  categories: mongoose.Types.ObjectId[];
  locations: ILocation[];
  status: "open" | "closed" | "ended";
  createdAt: Date; // The time when the room was created
}

const locationSchema = new Schema<ILocation>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String },
});

const roomSchema = new Schema<IRoom>({
  code: { type: String, required: true, index: true },
  adminUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  locations: [locationSchema],
  status: {
    type: String,
    enum: ["open", "closed", "ended"],
    default: "open",
  },
  createdAt: { type: Date, default: Date.now },
});

const Room = models.Room || mongoose.model<IRoom>("Room", roomSchema);

export default Room;
