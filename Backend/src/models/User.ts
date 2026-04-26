import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone:   { type: String, default: '' },
    city:    { type: String, default: '' },
    bio:     { type: String, default: '' },
    avatar:  { type: String, default: '' },   // profile image URL / base64

    // ── Auth provider: Facebook removed ───────────────────────────────────
    provider: {
      type: String,
      enum: ['email', 'Google', 'Apple'],
      default: 'email',
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['Active', 'Blocked'],
      default: 'Active',
    },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    tripsUsed: { type: Number, default: 0 },

    // ── Brute-force protection (SRS §3.2.1) ──────────────────────────────
    // Tracks consecutive failed email/password login attempts. Resets to 0
    // on a successful login. Once it hits FAILED_LOGIN_THRESHOLD, lockedUntil
    // is set and the counter is reset.
    failedLoginAttempts: { type: Number, default: 0, select: false },
    // When this is in the future, login is rejected without checking password.
    // Cleared automatically on successful login.
    lockedUntil:         { type: Date,   default: null, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['password'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;
