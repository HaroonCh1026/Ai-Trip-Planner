import { Request, Response, NextFunction } from 'express';
import Blog from '../models/Blog';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { logAdminAction } from '../services/adminLog.service';

// ─── GET /api/blogs (public) ───────────────────────────────────────────────
export const getPublishedBlogs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blogs = await Blog.find({ published: true }).sort({ createdAt: -1 });
    sendSuccess(res, { blogs, count: blogs.length });
  } catch (err) { next(err); }
};

// ─── GET /api/blogs/:id (public) ──────────────────────────────────────────
export const getBlogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, published: true });
    if (!blog) { sendError(res, 'Blog not found.', 404); return; }
    sendSuccess(res, { blog });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/blogs (admin — all including drafts) ──────────────────
export const getAllBlogs = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    sendSuccess(res, { blogs, count: blogs.length });
  } catch (err) { next(err); }
};

// ─── POST /api/admin/blogs ────────────────────────────────────────────────
export const createBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, excerpt, content, image, category, author, readTime, published } = req.body;
    if (!title || !excerpt || !content) {
      sendError(res, 'Title, excerpt and content are required.', 400); return;
    }
    const blog = await Blog.create({ title, excerpt, content, image: image || '', category: category || 'Travel Tips', author: author || 'VoyageurAI Team', readTime: readTime || '5 min read', published: published !== false });
    await logAdminAction({
      action: 'blog.create',
      performedBy: req.user!.id,
      targetId: blog._id.toString(),
      targetType: 'blogs',
      details: `Created blog "${blog.title}"${blog.published ? ' (published)' : ' (draft)'}`,
    });
    sendSuccess(res, { blog }, 'Blog created successfully', 201);
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/blogs/:id ───────────────────────────────────────────
export const updateBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allowed = ['title', 'excerpt', 'content', 'image', 'category', 'author', 'readTime', 'published'];
    const updates: Record<string, unknown> = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const blog = await Blog.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!blog) { sendError(res, 'Blog not found.', 404); return; }
    // Build a concise summary of which fields changed (without dumping content body).
    const summaryFields = Object.keys(updates).filter((k) => k !== 'content');
    const summary = summaryFields.length > 0 ? summaryFields.join(', ') : 'content';
    await logAdminAction({
      action: 'blog.update',
      performedBy: req.user!.id,
      targetId: blog._id.toString(),
      targetType: 'blogs',
      details: `Updated blog "${blog.title}" (fields: ${summary})`,
    });
    sendSuccess(res, { blog }, 'Blog updated');
  } catch (err) { next(err); }
};

// ─── DELETE /api/admin/blogs/:id ──────────────────────────────────────────
export const deleteBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) { sendError(res, 'Blog not found.', 404); return; }
    await logAdminAction({
      action: 'blog.delete',
      performedBy: req.user!.id,
      targetId: req.params.id,
      targetType: 'blogs',
      details: `Deleted blog "${blog.title}"`,
    });
    sendSuccess(res, null, 'Blog deleted');
  } catch (err) { next(err); }
};
