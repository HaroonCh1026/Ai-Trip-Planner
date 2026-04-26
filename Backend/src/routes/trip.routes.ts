import { Router } from 'express';
import { createTrip, getUserTrips, getTripById, deleteTrip, updateTripStatus } from '../controllers/trip.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/',              createTrip);
router.get('/',               getUserTrips);
router.get('/:id',            getTripById);
router.delete('/:id',         deleteTrip);
router.patch('/:id/status',   updateTripStatus);

export default router;
