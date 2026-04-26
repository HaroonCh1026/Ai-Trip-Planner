import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void => {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: string[]
): void => {
  const body: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(body);
};
