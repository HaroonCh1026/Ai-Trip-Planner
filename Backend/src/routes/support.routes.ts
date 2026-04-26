import { Router } from 'express';
import { createTicket, getMyTickets, addUserMessage, getMyTicketById } from '../controllers/support.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

// optionalAuthenticate so logged-in users get userId attached to their ticket,
// but guests can still file tickets without a token.
router.post('/', optionalAuthenticate, createTicket);
router.get('/my', authenticate, getMyTickets);
router.post('/:id/message', authenticate, addUserMessage);
// IMPORTANT: must come after /my so the literal route wins.
router.get('/:id', authenticate, getMyTicketById);

export default router;