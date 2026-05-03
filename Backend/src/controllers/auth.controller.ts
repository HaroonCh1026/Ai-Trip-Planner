import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import User from "../models/User";
import { signToken } from "../utils/jwt";
import { sendSuccess, sendError } from "../utils/response";
import { AuthRequest } from "../types";
import config from "../config/config";
import crypto from "crypto";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/emailTemplates";
import { getEffectiveConfig } from "../services/adminConfig.service";
//                                                    ^^^^^^^^^^^^^^^^ Add this

const buildUserPayload = (user: InstanceType<typeof User>) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  city: user.city,
  bio: user.bio,
  avatar: user.avatar || "",
  role: user.role,
  status: user.status,
  plan: user.plan,
  tripsUsed: user.tripsUsed,
  provider: user.provider,
  isAdmin: user.role === "admin",
  joinDate: new Date(user.createdAt).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  createdAt: user.createdAt,
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password, phone, city, provider } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      sendError(res, "Email already registered.", 409);
      return;
    }
    const role = email.toLowerCase() === config.adminEmail ? "admin" : "user";
    const user = await User.create({
      name,
      email,
      password: password || undefined,
      phone: phone || "",
      city: city || "",
      role,
      provider: provider || "email",
    });
    const token = signToken({ id: user._id.toString(), role: user.role });

    // Fire-and-forget welcome email. Failures are logged inside sendEmail
    // and never bubble up — registration must succeed even if email is down.
    sendWelcomeEmail({ name: user.name, email: user.email }).catch(
      () => undefined,
    );

    sendSuccess(
      res,
      { token, user: buildUserPayload(user) },
      "Account created successfully",
      201,
    );
  } catch (err) {
    next(err);
  }
};

// ─── Account lockout config (SRS §3.2.1) ───────────────────────────────────
// After this many consecutive failed attempts, the account is locked for
// LOCKOUT_DURATION_MS. Counter resets on successful login.
const FAILED_LOGIN_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Pull lockout fields too — they are select:false by default.
    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +lockedUntil",
    );

    if (!user) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    // Check lockout window first. If lockedUntil is in the future, refuse the
    // login attempt entirely. This protects the password hash from being checked
    // and avoids burning CPU on bcrypt compares for locked accounts.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minsLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      // 423 Locked is the semantically correct status code here.
      sendError(
        res,
        `Account temporarily locked due to too many failed login attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? "" : "s"}.`,
        423,
      );
      return;
    }

    if (user.status === "Blocked") {
      sendError(
        res,
        "Your account has been suspended. Please contact support.",
        403,
      );
      return;
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Failed attempt: increment counter and lock if threshold hit.
      const nextCount = (user.failedLoginAttempts || 0) + 1;
      if (nextCount >= FAILED_LOGIN_THRESHOLD) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        user.failedLoginAttempts = 0; // reset counter once locked
        await user.save();
        sendError(
          res,
          `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MS / 60000} minutes.`,
          423,
        );
        return;
      }
      user.failedLoginAttempts = nextCount;
      await user.save();
      const remaining = FAILED_LOGIN_THRESHOLD - nextCount;
      sendError(
        res,
        `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`,
        401,
      );
      return;
    }

    // Success: clear lockout state.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await user.save();
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    sendSuccess(
      res,
      { token, user: buildUserPayload(user) },
      "Login successful",
    );
  } catch (err) {
    next(err);
  }
};

export const socialLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, provider } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      const role = email.toLowerCase() === config.adminEmail ? "admin" : "user";
      user = await User.create({ name, email, provider, role });
    } else if (user.status === "Blocked") {
      sendError(res, "Your account has been suspended.", 403);
      return;
    }
    const token = signToken({ id: user._id.toString(), role: user.role });
    sendSuccess(
      res,
      { token, user: buildUserPayload(user) },
      "Login successful",
    );
  } catch (err) {
    next(err);
  }
};

export const googleAuth = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const { clientId, callbackUrl } = config.google;
  // prompt=select_account forces the Google account chooser even if the user
  // is already logged in to a Google account in the browser (SRS §3.2.1 fix #5).
  const redirectUri = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=email%20profile&prompt=select_account&access_type=online`;
  res.redirect(redirectUri);
};

export const googleOAuthCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code, error } = req.query as { code?: string; error?: string };
    const frontendUrl = config.frontendUrl;
    if (error || !code) {
      return res.redirect(
        `${frontendUrl}?auth_error=access_denied`,
      ) as unknown as void;
    }
    const { clientId, clientSecret, callbackUrl } = config.google;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok)
      throw new Error("Failed to exchange Google authorization code.");
    const tokenData = (await tokenRes.json()) as { access_token: string };
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    if (!profileRes.ok) throw new Error("Failed to fetch Google user profile.");
    const profile = (await profileRes.json()) as {
      email: string;
      name: string;
      picture?: string;
    };
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      const role =
        profile.email.toLowerCase() === config.adminEmail ? "admin" : "user";
      // Google's profile picture URL is stored as-is — it's already hosted by Google.
      user = await User.create({
        name: profile.name,
        email: profile.email,
        provider: "Google",
        role,
        tripsUsed: 0,
        plan: "free",
        status: "Active",
        avatar: profile.picture || "",
      });
    } else if (user.status === "Blocked") {
      return res.redirect(
        `${frontendUrl}?auth_error=account_suspended`,
      ) as unknown as void;
    }
    const token = signToken({ id: user._id.toString(), role: user.role });
    // Token-only redirect. Frontend fetches user via /auth/me. We used to
    // include the full user JSON in the URL too, but that caused 431 errors
    // on Vite once the avatar field grew large.
    return res.redirect(
      `${frontendUrl}?auth_token=${token}`,
    ) as unknown as void;
  } catch (err) {
    next(err);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Include planExpires field when fetching user
    const user = await User.findById(req.user!.id).select('+planExpires');
    
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }

    // ─── Pro Expiry Lazy Check (Round 8) ──────────────────────────────────
    // If user is 'pro' but planExpires is in the past, downgrade to 'free'
    if (user.plan === 'pro' && user.planExpires && user.planExpires < new Date()) {
      user.plan = 'free';
      user.planExpires = null;
      await user.save();
      console.log(`[auth] Downgraded expired pro user: ${user.email}`);
    }
    // ──────────────────────────────────────────────────────────────────────

    // ─── Day 6: include effective free trip limit (admin-editable) ────────
    // The frontend uses this to display "X / Y free trips used" correctly
    // even if admin lowers the limit via Pricing Controls. Cached with 30s
    // TTL in adminConfig.service so this is essentially free.
    const cfg = await getEffectiveConfig();

    sendSuccess(res, {
      user: buildUserPayload(user),
      config: {
        freeTripLimit: cfg.freeTripLimit,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updates: Record<string, string> = {};
    // Note: 'avatar' is intentionally NOT in this list. Image uploads go through
    // POST /auth/avatar (multipart). This endpoint handles text fields and password.
    const allowed = ["name", "phone", "city", "bio"];
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    // Password change support
    if (req.body.newPassword) {
      const user = await User.findById(req.user!.id).select("+password");
      if (!user) {
        sendError(res, "User not found.", 404);
        return;
      }
      if (user.provider === "email" && req.body.currentPassword) {
        const ok = await user.comparePassword(req.body.currentPassword);
        if (!ok) {
          sendError(res, "Current password is incorrect.", 400);
          return;
        }
      }
      user.password = req.body.newPassword;
      await user.save();
      sendSuccess(
        res,
        { user: buildUserPayload(user) },
        "Password updated successfully",
      );
      return;
    }
    const user = await User.findByIdAndUpdate(req.user!.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }
    sendSuccess(res, { user: buildUserPayload(user) }, "Profile updated");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/forgot-password ────────────────────────────────────────
// Sends a password reset email to the user if the email exists in the system.
// For security, we don't reveal whether the email exists — same response either way.
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendError(res, "Email is required.", 400);
      return;
    }

    // Find user (don't select password by default, but we need it for token)
    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires",
    );

    // Always return success even if user doesn't exist (security best practice)
    // This prevents email enumeration attacks
    if (!user) {
      // Still log that we didn't find the user, but don't reveal to client
      console.log(`[forgot-password] Email not found: ${email}`);
      sendSuccess(
        res,
        null,
        "If an account with that email exists, a password reset link has been sent.",
      );
      return;
    }

    // Don't allow password reset for social login users (Google, Apple)
    if (user.provider !== "email") {
      console.log(
        `[forgot-password] Social login user attempted reset: ${email} (provider: ${user.provider})`,
      );
      sendSuccess(
        res,
        null,
        "If an account with that email exists, a password reset link has been sent.",
      );
      return;
    }

    // Generate secure reset token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing for security (we don't store plain token in DB)
    // But for simplicity with URL passing, we'll store plain token + expiry
    // This is acceptable because tokens are short-lived (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email
    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (!emailSent && config.nodeEnv === "development") {
      // In development, log the token so you can test without real SMTP
      console.log(`\n📧 [DEV MODE] Password reset link for ${email}:`);
      console.log(`${config.frontendUrl}/reset-password/${resetToken}\n`);
    }

    sendSuccess(
      res,
      null,
      "If an account with that email exists, a password reset link has been sent.",
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/reset-password ────────────────────────────────────────
// Resets the user's password using a valid reset token.
// Backend/src/controllers/auth.controller.ts
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      sendError(res, "Token and new password are required.", 400);
      return;
    }

    if (password.length < 8) {
      sendError(res, "Password must be at least 8 characters.", 400);
      return;
    }

    // Find user with valid reset token that hasn't expired
    // REMOVED THE .select() line - not needed anymore
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, "Invalid or expired password reset token.", 400);
      return;
    }

    // Don't allow password reset for social login users
    if (user.provider !== "email") {
      sendError(
        res,
        "Cannot reset password for accounts using social login.",
        400,
      );
      return;
    }

    // Set new password
    user.password = password;
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    sendSuccess(
      res,
      null,
      "Password has been reset successfully. You can now log in with your new password.",
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/avatar — multipart/form-data, field name "image" ───────
// Saves the uploaded image to disk via multer (configured in upload.middleware.ts),
// deletes the previous local upload (if any), and updates user.avatar to a
// /uploads/... URL.
export const uploadAvatarHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, "No image file provided.", 400);
      return;
    }
    const user = await User.findById(req.user!.id);
    if (!user) {
      // Clean up the orphaned upload
      fs.unlink(req.file.path, () => undefined);
      sendError(res, "User not found.", 404);
      return;
    }
    // If the previous avatar was a local upload (starts with /uploads/), delete it.
    // External URLs (Google profile pic, etc.) are left alone.
    if (user.avatar && user.avatar.startsWith("/uploads/")) {
      const oldPath = path.join(process.cwd(), user.avatar);
      fs.unlink(oldPath, () => undefined); // best-effort
    }
    // Public URL the frontend will use as <img src>.
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    sendSuccess(res, { user: buildUserPayload(user) }, "Avatar updated");
  } catch (err) {
    // If the DB write failed but the file landed on disk, clean it up.
    if (req.file?.path) fs.unlink(req.file.path, () => undefined);
    next(err);
  }
};