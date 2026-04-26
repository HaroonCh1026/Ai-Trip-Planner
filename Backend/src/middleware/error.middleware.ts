import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import config from '../config/config';

interface AppError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
  path?: string;
  value?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key (email already exists)
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = 409;
  }

  if (err instanceof MongooseError.CastError) {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  if (err instanceof MongooseError.ValidationError) {
    message = Object.values(err.errors).map((e) => e.message).join(', ');
    statusCode = 422;
  }

  if (err.name === 'JsonWebTokenError') { message = 'Invalid token.'; statusCode = 401; }
  if (err.name === 'TokenExpiredError') { message = 'Token has expired.'; statusCode = 401; }

  const body: Record<string, unknown> = { success: false, message };
  if (config.nodeEnv === 'development') body.stack = err.stack;

  res.status(statusCode).json(body);
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
