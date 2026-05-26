import mongoose, { models } from "mongoose";

export interface FavoriteVenue {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: string;
}

export interface IUser {
  _id: string;
  fname: string;
  lname: string;
  email: string;
  password: string;
  admin: boolean;
  phone: string;
  regDate: Date;
  passwordChangedAt: Date;
  favoriteVenues: FavoriteVenue[];
}

const favoriteVenueSchema = new mongoose.Schema<FavoriteVenue>({
  name: { type: String, required: true },
  description: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  category: { type: String },
}, { _id: false });

const userSchema = new mongoose.Schema<IUser>({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  admin: { type: Boolean, default: false },
  phone: { type: String, required: true },
  regDate: { type: Date, default: Date.now },
  passwordChangedAt: { type: Date },
  favoriteVenues: { type: [favoriteVenueSchema], default: [] },
});

const User = models.User || mongoose.model<IUser>("User", userSchema);

export default User;
