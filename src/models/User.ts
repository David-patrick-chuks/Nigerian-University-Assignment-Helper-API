import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  fullName: string;
  googleId?: string;
  avatar?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  credits: number;
  refreshTokens: string[];
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  fullName: { type: String, required: true },
  googleId: { type: String },
  avatar: { type: String },
  googleAccessToken: { type: String },
  googleRefreshToken: { type: String },
  credits: { type: Number, default: 0 },
  refreshTokens: [{ type: String }],
}, { timestamps: true });

const User = mongoose.model<IUser>('User', UserSchema);
export default User; 