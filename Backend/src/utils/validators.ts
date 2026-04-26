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
});

// ─── Save Trip ─────────────────────────────────────────────────────────────
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
