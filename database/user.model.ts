import mongoose, { models } from "mongoose";

export interface IUser {
  _id: string;
  fname: string; // First Name
  lname: string; // Last Name
  email: string;
  password: string;
  admin: boolean; // Whether user is admin
  phone: string; // Phone number
  activated: boolean; // Whether the user has activated via email
  regDate: Date; // Date of registration
  emailToken: string; // Token for user activation
  emailTokenExpires: Date; // Time when token expires
  resetToken: string; // Token for password reset
  resetTokenExpires: Date; // Time when reset token expires
  passwordChangedAt: Date; // Timestamp of last password change
}

const userSchema = new mongoose.Schema<IUser>({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: true,
  },
  admin: { type: Boolean, default: false },
  phone: { type: String, required: true },
  activated: { type: Boolean, default: true },
  regDate: { type: Date, default: Date.now },
  emailToken: { type: String, unique: true, sparse: true },
  emailTokenExpires: { type: Date },
  resetToken: { type: String, unique: true, sparse: true },
  resetTokenExpires: { type: Date },
  passwordChangedAt: { type: Date },
});

const User = models.User || mongoose.model<IUser>("User", userSchema);

export default User;
