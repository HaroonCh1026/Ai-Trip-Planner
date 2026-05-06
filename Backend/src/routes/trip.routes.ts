import { Router } from 'express';
import { createTrip, getUserTrips, getTripById, deleteTrip, updateTripStatus } from '../controllers/trip.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { saveTripSchema, updateTripStatusSchema } from '../utils/validators';

const router = Router();
router.use(authenticate);

// POST /api/trips — wired through validate() in post-Round 7 fix.
// Previously the route had no validation at all and Mongoose strict mode
// was the only thing protecting the Trip model. Joi's stripUnknown:true
// now enforces the field whitelist before the controller runs.
router.post('/',              validate(saveTripSchema),         createTrip);
router.get('/',               getUserTrips);
router.get('/:id',            getTripById);
router.delete('/:id',         deleteTrip);
router.patch('/:id/status',   validate(updateTripStatusSchema), updateTripStatus);

export default router;