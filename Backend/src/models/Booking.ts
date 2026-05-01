import mongoose, { Schema } from 'mongoose';
import { IBooking } from '../types';

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // tripId is optional for subscription-type bookings
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: false,
      default: null,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Cancelled'],
      default: 'Pending',
    },
    planType: {
      type: String,
      default: null,
    },

    // ── Day 4: trip booking simulation fields ────────────────────────────
    // bookingType distinguishes trip bookings (new) from subscription
    // bookings (existing). Defaults to 'subscription' for backward
    // compatibility with all existing rows in the DB.
    bookingType: {
      type: String,
      enum: ['trip', 'subscription'],
      default: 'subscription',
      index: true,
    },
    // baseAmount = trip's totalCost from Gemini at the moment of booking.
    // Stored separately from `amount` so admin analytics can compute revenue
    // (= sum of serviceFee) vs gross transaction volume (= sum of amount).
    baseAmount: { type: Number, default: 0, min: 0 },
    // 8% on top of baseAmount. Admin will be able to edit the percentage in
    // Day 5 via AdminConfig — this field stores the actual fee charged.
    serviceFee: { type: Number, default: 0, min: 0 },
    // finalAmount = baseAmount + serviceFee. We persist it (rather than
    // computing on the fly) because the underlying Trip's totalCost might
    // change later (refinement) and we need an immutable booking record.
    finalAmount: { type: Number, default: 0, min: 0 },
    // Snapshot of trip details at booking time — destination, dates, etc.
    // Stored as Mixed because we want a frozen copy that survives even if
    // the original Trip document is deleted. Used to render the booking
    // confirmation page and admin booking list without re-fetching the Trip.
    tripSnapshot: { type: Schema.Types.Mixed, default: null },
    // Optional vehicle the user picked — useful for admin reporting.
    vehicleId: { type: String, default: null },
    groupSize: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Auto-generate human-readable bookingId on first save (BK-9001, BK-9002...).
// Existing pre-save hook preserved.
bookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingId = `BK-${9000 + count + 1}`;
  }
  next();
});

const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
export default Booking;