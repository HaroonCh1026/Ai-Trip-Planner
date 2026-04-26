import { Router } from 'express';
import { getPublishedBlogs, getBlogById } from '../controllers/blog.controller';

const router = Router();

router.get('/', getPublishedBlogs);
router.get('/:id', getBlogById);

export default router;
