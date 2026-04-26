import mongoose, { Schema } from 'mongoose';
import { IBlog } from '../types';

const blogSchema = new Schema<IBlog>(
  {
    title:     { type: String, required: true, trim: true, maxlength: 200 },
    excerpt:   { type: String, required: true, maxlength: 500 },
    content:   { type: String, required: true },
    image:     { type: String, default: '' },
    category:  { type: String, default: 'Travel Tips', trim: true },
    author:    { type: String, default: 'VoyageurAI Team' },
    readTime:  { type: String, default: '5 min read' },
    published: { type: Boolean, default: true },
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

const Blog = mongoose.model<IBlog>('Blog', blogSchema);
export default Blog;
