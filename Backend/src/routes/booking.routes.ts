import { Router } from 'express';
import { createBooking, getUserBookings, upgradeSubscription } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createBookingSchema } from '../utils/validators';

const router = Router();

router.use(authenticate);

router.post('/upgrade', upgradeSubscription);           // FR-5: Stripe test payment
router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getUserBookings);

export default router;
