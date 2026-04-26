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

bookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingId = `BK-${9000 + count + 1}`;
  }
  next();
});

const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
export default Booking;
