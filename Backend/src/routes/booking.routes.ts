import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  upgradeSubscription,
  bookTrip,
  getBookingById,
} from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createBookingSchema } from '../utils/validators';

const router = Router();

router.use(authenticate);

router.post('/upgrade', upgradeSubscription);           // FR-5: Stripe test payment
// Day 4: trip booking simulation — adds 8% service fee, returns confirmation
router.post('/trip', bookTrip);
router.get('/:id', getBookingById);
router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getUserBookings);

export default router;