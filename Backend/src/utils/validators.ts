import Joi from 'joi';

// ─── Auth ──────────────────────────────────────────────────────────────────
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  phone:    Joi.string().allow('').default(''),
  city:     Joi.string().allow('').default(''),
  // Facebook removed
  provider: Joi.string().valid('email', 'Google', 'Apple').default('email'),
});

export const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

export const socialLoginSchema = Joi.object({
  name:     Joi.string().min(1).required(),
  email:    Joi.string().email().required(),
  // Facebook removed
  provider: Joi.string().valid('Google', 'Apple').required(),
});

// ─── Profile update ────────────────────────────────────────────────────────
export const updateProfileSchema = Joi.object({
  name:            Joi.string().min(2).max(50),
  phone:           Joi.string().allow(''),
  city:            Joi.string().allow(''),
  bio:             Joi.string().max(300).allow(''),
  avatar:          Joi.string().allow(''),          // base64 or URL
  currentPassword: Joi.string().min(8).allow(''),   // for password change
  newPassword:     Joi.string().min(8).allow(''),   // for password change
});

// ─── AI Generate ───────────────────────────────────────────────────────────
export const generateTripSchema = Joi.object({
  origin: Joi.string().min(2).max(100).required().messages({
    'any.required': 'Origin is required',
  }),
  destination: Joi.string().min(2).max(100).required().messages({
    'any.required': 'Destination is required',
  }),
  days: Joi.alternatives()
    .try(Joi.number().integer().min(1).max(30), Joi.string().pattern(/^\d+$/))
    .required()
    .messages({ 'any.required': 'Number of days is required' }),
  startDate: Joi.string().required().messages({
    'any.required': 'Start date is required',
  }),
  budget: Joi.alternatives()
    .try(Joi.number().min(0), Joi.string().pattern(/^\d+$/))
    .required()
    .messages({ 'any.required': 'Budget is required' }),
  preferences: Joi.string().max(500).allow('').default('Architecture, Culture, Logistics'),
  // Day 3 (vehicle picker step) fields. Optional — backend gracefully falls
  // back to "shared intercity bus" defaults when omitted.
  //
  // BUG FIX (post-Round 7): these were missing from the schema, so the
  // validate middleware (stripUnknown: true) was silently deleting them
  // from req.body before the controller ran. Result: every trip ignored
  // the user's picked vehicle (showed "Intercity Bus") AND defaulted to
  // groupSize=1 regardless of party size, which also bypassed the
  // group-size cost floor in ai.controller.ts.
  vehicleId: Joi.string().max(50).optional(),
  groupSize: Joi.alternatives()
    .try(Joi.number().integer().min(1).max(20), Joi.string().pattern(/^\d+$/))
    .optional(),
});

// ─── Save Trip ─────────────────────────────────────────────────────────────
// Wired into POST /api/trips via validate() middleware (post-Round 7 fix).
// Before this, the route had no validation at all, so Mongoose strict mode
// was the only thing protecting the Trip model. Now we explicitly whitelist
// every legitimate field and let unknown fields be stripped server-side
// instead of relying on the model schema as a security boundary.
export const saveTripSchema = Joi.object({
  destination:     Joi.string().required(),
  origin:          Joi.string().required(),
  days:            Joi.alternatives().try(Joi.number().integer().min(1).max(30), Joi.string()).required(),
  budget:          Joi.alternatives().try(Joi.number().min(0), Joi.string()).required(),
  startDate:       Joi.string().required(),
  dates:           Joi.string().allow('').default(''),
  image:           Joi.string().allow('').default(''),
  itinerary:       Joi.array().default([]),
  summary:         Joi.string().allow('').default(''),
  totalCost:       Joi.number().default(0),
  tips:            Joi.array().items(Joi.string()).default([]),
  bestTimeToVisit: Joi.string().allow('').default(''),
  currency:        Joi.string().default('Pakistani Rupee (PKR)'),
  language:        Joi.string().default('Urdu/English'),
  emergencyNumbers:Joi.string().allow('').default(''),
  // 'cancelled' added
  status:          Joi.string().valid('upcoming', 'completed', 'cancelled').default('upcoming'),
  // ── Day 3 vehicle-selection step (post-Round 7 persistence fix) ────────
  // Persist what the user originally picked so re-opens, refinements, and
  // admin analytics can see the trip's transport context.
  vehicleId:       Joi.string().max(50).allow('').default(''),
  groupSize:       Joi.alternatives()
                     .try(Joi.number().integer().min(1).max(20), Joi.string().pattern(/^\d+$/))
                     .default(1),
  // ── AI-attached snapshots ──────────────────────────────────────────────
  // These come back from POST /api/ai/generate and the frontend forwards
  // them to POST /api/trips. The server doesn't trust them blindly — Joi
  // here just permits the fields through; Mongoose's typed schemas
  // (mlPredictionSchema, etc.) enforce shape on the model side.
  mlPrediction:    Joi.object().unknown(true).optional(),
  feasibility:     Joi.object().unknown(true).optional(),
  insiderInsights: Joi.object().unknown(true).optional(),
});

// ─── Update Trip Status ────────────────────────────────────────────────────
export const updateTripStatusSchema = Joi.object({
  // 'cancelled' added
  status: Joi.string().valid('upcoming', 'completed', 'cancelled').required(),
});

// ─── Admin: Block / Unblock User ──────────────────────────────────────────
export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid('Active', 'Blocked').required(),
});

// ─── Booking ───────────────────────────────────────────────────────────────
export const createBookingSchema = Joi.object({
  tripId: Joi.string().required(),
  amount: Joi.number().min(0).required(),
});

// ─── Support Ticket ────────────────────────────────────────────────────────
export const createTicketSchema = Joi.object({
  name:     Joi.string().min(2).max(80).required().messages({ 'any.required': 'Name is required' }),
  email:    Joi.string().email().required().messages({ 'any.required': 'Email is required' }),
  category: Joi.string()
    .valid('Technical', 'Billing', 'General Inquiry', 'Trip Issue')
    .default('General Inquiry'),
  message:  Joi.string().min(10).max(2000).required().messages({
    'any.required': 'Message is required',
    'string.min': 'Message must be at least 10 characters',
  }),
});

export const updateTicketSchema = Joi.object({
  status:     Joi.string().valid('Open', 'In Progress', 'Closed'),
  adminReply: Joi.string().max(2000).allow(''),
});

// Backend/src/utils/validators.ts
// Add these after your existing schemas:

// ─── Password Reset (Round 6) ──────────────────────────────────────────────
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().min(32).required().messages({
    'string.min': 'Invalid reset token',
    'any.required': 'Reset token is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'New password is required',
  }),
});