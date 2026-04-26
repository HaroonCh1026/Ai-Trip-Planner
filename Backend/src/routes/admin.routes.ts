import { Router } from 'express';
import { getStats, getAllUsers, updateUserStatus, deleteUser, getAllTrips, getAllBookings, getAdminLogs } from '../controllers/admin.controller';
import { getAllTickets, updateTicket, addTicketMessage } from '../controllers/support.controller';
import { getAllBlogs, createBlog, updateBlog, deleteBlog } from '../controllers/blog.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateUserStatusSchema } from '../utils/validators';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/stats',                  getStats);
router.get('/users',                  getAllUsers);
router.patch('/users/:id/status',     validate(updateUserStatusSchema), updateUserStatus);
router.delete('/users/:id',           deleteUser);
router.get('/trips',                  getAllTrips);
router.get('/bookings',               getAllBookings);

// Audit log
router.get('/logs',                   getAdminLogs);

// Support tickets
router.get('/support',                getAllTickets);
router.patch('/support/:id',          updateTicket);
router.post('/support/:id/message',   addTicketMessage);

// Blogs CRUD
router.get('/blogs',                  getAllBlogs);
router.post('/blogs',                 createBlog);
router.patch('/blogs/:id',            updateBlog);
router.delete('/blogs/:id',           deleteBlog);

export default router;
