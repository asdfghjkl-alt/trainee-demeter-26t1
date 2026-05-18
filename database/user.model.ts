import mongoose, { models } from "mongoose";

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
}

const userSchema = new mongoose.Schema<IUser>({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  admin: { type: Boolean, default: false },
  phone: { type: String, required: true },
  regDate: { type: Date, default: Date.now },
  passwordChangedAt: { type: Date },
});

const User = models.User || mongoose.model<IUser>("User", userSchema);

export default User;
