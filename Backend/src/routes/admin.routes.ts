import { Router } from 'express';
import { getStats, getAllUsers, updateUserStatus, deleteUser, getAllTrips, getAllBookings, getAdminLogs, getConfig, updateConfig } from '../controllers/admin.controller';
import { getRevenueSummary, getRevenueByDestination, getMonthlyRevenue } from '../controllers/revenue.controller';
import { getMLAnalyticsMeta, getMLPredictions, getMLByRegion } from '../controllers/mlAnalytics.controller';
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

// Day 5A: pricing controls — service fee, fuel price, vehicle/route overrides
router.get('/config',                 getConfig);
router.patch('/config',               updateConfig);

// Day 5B: revenue analytics — GMV, fee revenue, by-destination, monthly trend
router.get('/revenue/summary',        getRevenueSummary);
router.get('/revenue/by-destination', getRevenueByDestination);
router.get('/revenue/monthly',        getMonthlyRevenue);

// Day 5C: ML analytics — model metadata, predictions scatter, regional accuracy
router.get('/ml-analytics/meta',         getMLAnalyticsMeta);
router.get('/ml-analytics/predictions',  getMLPredictions);
router.get('/ml-analytics/by-region',    getMLByRegion);

export default router;