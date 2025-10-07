import { Request, Response, NextFunction } from 'express';

// Standardized error response interface
export interface StandardError {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
}

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'DATABASE_ERROR');
    this.details = originalError;
  }
}

export class CacheError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'CACHE_ERROR');
    this.details = originalError;
  }
}

// Error handler middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    error = new ValidationError(message);
  }

  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = new ValidationError(message);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  if (err.name === 'SyntaxError' && 'body' in err) {
    error = new ValidationError('Invalid JSON format');
  }

  // Handle database connection errors
  if (err.message.includes('ECONNREFUSED') || err.message.includes('connection')) {
    error = new DatabaseError('Database connection failed');
  }

  // Handle Redis connection errors
  if (err.message.includes('Redis') || err.message.includes('redis')) {
    error = new CacheError('Cache service unavailable');
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500);
  }

  // Create standardized error response
  const errorResponse: StandardError = {
    success: false,
    error: error.message,
    code: error.code,
    details: error.details,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  res.status(error.statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const handleValidationError = (errors: any[]): ValidationError => {
  const message = errors.map(err => err.message).join(', ');
  return new ValidationError(message, errors);
};

// Database error handler
export const handleDatabaseError = (err: any): DatabaseError => {
  let message = 'Database operation failed';
  
  if (err.code === '23505') {
    message = 'Duplicate entry - resource already exists';
  } else if (err.code === '23503') {
    message = 'Foreign key constraint violation';
  } else if (err.code === '23502') {
    message = 'Required field is missing';
  } else if (err.code === '42P01') {
    message = 'Table does not exist';
  } else if (err.code === '42703') {
    message = 'Column does not exist';
  }

  return new DatabaseError(message, err);
};

// Cache error handler
export const handleCacheError = (err: any): CacheError => {
  return new CacheError('Cache operation failed', err);
};

// Success response helper
export const sendSuccessResponse = (res: Response, data: any, message?: string, statusCode: number = 200): void => {
  const response = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
};

// Paginated response helper
export const sendPaginatedResponse = (
  res: Response, 
  data: any[], 
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message?: string
): void => {
  const response = {
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
};