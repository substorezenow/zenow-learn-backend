import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Validation schemas
export const validationSchemas = {
  // Category schemas
  createCategory: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().min(2).max(100).pattern(/^[a-z0-9-]+$/).optional(),
    description: Joi.string().max(1000).optional(),
    icon_url: Joi.string().allow('').optional(),
    banner_image: Joi.string().allow('').optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional()
  }),

  updateCategory: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    slug: Joi.string().min(2).max(100).pattern(/^[a-z0-9-]+$/).optional(),
    description: Joi.string().max(1000).optional(),
    icon_url: Joi.string().allow('').optional(),
    banner_image: Joi.string().allow('').optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional()
  }),

  // Field schemas
  createField: Joi.object({
    category_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().min(2).max(100).pattern(/^[a-z0-9-]+$/).optional(),
    description: Joi.string().max(1000).optional(),
    icon_url: Joi.string().allow('').optional(),
    banner_image: Joi.string().allow('').optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional()
  }),

  updateField: Joi.object({
    category_id: Joi.number().integer().positive().optional(),
    name: Joi.string().min(2).max(100).optional(),
    slug: Joi.string().min(2).max(100).pattern(/^[a-z0-9-]+$/).optional(),
    description: Joi.string().max(1000).optional(),
    icon_url: Joi.string().allow('').optional(),
    banner_image: Joi.string().allow('').optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional()
  }),

  // Course schemas
  createCourse: Joi.object({
    field_id: Joi.number().integer().positive().required(),
    title: Joi.string().min(2).max(200).required(),
    slug: Joi.string().min(2).max(200).pattern(/^[a-z0-9-]+$/).optional(),
    description: Joi.string().max(5000).optional(),
    short_description: Joi.string().max(500).optional(),
    banner_image: Joi.string().allow('').optional(),
    thumbnail_image: Joi.string().allow('').optional(),
    duration_hours: Joi.number().integer().min(0).max(1000).optional(),
    difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    price: Joi.number().min(0).max(9999.99).optional(),
    is_free: Joi.boolean().optional(),
    is_published: Joi.boolean().optional(),
    instructor_id: Joi.string().uuid().optional(),
    prerequisites: Joi.string().max(2000).optional(),
    learning_outcomes: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).optional(),
    course_modules: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.object())
    ).optional(),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).optional()
  }),

  updateCourse: Joi.object({
    field_id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/)
    ).allow(null).optional(),
    title: Joi.string().min(2).max(200).allow(null).optional(),
    slug: Joi.string().min(2).max(200).pattern(/^[a-z0-9-]+$/).allow(null).optional(),
    description: Joi.string().max(5000).allow(null).optional(),
    short_description: Joi.string().max(500).allow('', null).optional(),
    banner_image: Joi.string().allow('', null).optional(),
    thumbnail_image: Joi.string().allow('', null).optional(),
    duration_hours: Joi.number().integer().min(0).max(1000).allow(null).optional(),
    difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').allow(null).optional(),
    price: Joi.number().min(0).max(9999.99).allow(null).optional(),
    is_free: Joi.boolean().allow(null).optional(),
    is_published: Joi.boolean().allow(null).optional(),
    instructor_id: Joi.string().uuid().allow(null).optional(),
    prerequisites: Joi.string().max(2000).allow('', null).optional(),
    learning_outcomes: Joi.alternatives().try(
      Joi.string().allow(''),
      Joi.array().items(Joi.string()),
      Joi.valid(null)
    ).optional(),
    course_modules: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.object()),
      Joi.valid(null)
    ).optional(),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string()),
      Joi.valid(null)
    ).optional()
  }),

  // Auth schemas
  register: Joi.object({
    username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).required(),
    password: Joi.string().min(6).max(100).required()
  }),

  login: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(6).max(100).required(),
    fingerprint: Joi.string().optional()
  }),

  // Query parameter schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sort: Joi.string().valid('asc', 'desc').optional(),
    sortBy: Joi.string().optional()
  }),

  courseFilters: Joi.object({
    category_id: Joi.number().integer().positive().optional(),
    field_id: Joi.number().integer().positive().optional(),
    difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    is_free: Joi.boolean().optional(),
    search: Joi.string().max(100).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
  }),

  // Migration schemas
  createMigration: Joi.object({
    name: Joi.string().min(3).max(100).pattern(/^[a-z0-9-]+$/).required()
  })
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : 
                 source === 'query' ? req.query : 
                 req.params;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log('=== VALIDATION ERROR DEBUG ===');
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('Errors:', validationErrors);
      console.log('==============================');

      throw new ValidationError('Validation failed', validationErrors);
    }

    // Replace the original data with validated and sanitized data
    if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.query = value;
    } else {
      req.params = value;
    }

    next();
  };
};

// Response validation middleware
export const validateResponse = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;

    res.send = function(data: any) {
      try {
        // Only validate JSON responses
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            const { error, value } = schema.validate(parsed, {
              abortEarly: false,
              stripUnknown: true
            });

            if (error) {
              console.warn('Response validation failed:', error.details);
              // Don't throw error, just log warning
            } else {
              data = JSON.stringify(value);
            }
          } catch (parseError) {
            // Not JSON, send as is
          }
        }

        return originalSend.call(this, data);
      } catch (error) {
        console.error('Response validation error:', error);
        return originalSend.call(this, data);
      }
    };

    next();
  };
};

// Common validation schemas
export const commonValidations = {
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  slug: Joi.object({
    slug: Joi.string().min(2).max(200).pattern(/^[a-z0-9-]+$/).required()
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().optional()
  })
};

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize string inputs
  const sanitizeString = (str: any): any => {
    if (typeof str !== 'string') return str;
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body (handle both JSON and FormData)
  if (req.body) {
    // Check if it's FormData (from admin frontend)
    if (req.headers['content-type']?.includes('multipart/form-data') || 
        (typeof req.body === 'object' && req.body.username && req.body.password)) {
      // Handle FormData-like objects
      const sanitizedBody: any = {};
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          sanitizedBody[key] = sanitizeString(req.body[key]);
        } else {
          sanitizedBody[key] = req.body[key];
        }
      }
      req.body = sanitizedBody;
    } else {
      // Handle JSON objects
      req.body = sanitizeObject(req.body);
    }
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // Add rate limiting headers
  res.set({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString()
  });

  next();
};

// Content type validation
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        res.status(415).json({
          success: false,
          error: 'Unsupported Media Type',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          allowedTypes,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    next();
  };
};

// File upload validation
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
} = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], maxFiles = 5 } = options;

    if (!req.files) {
      next();
      return;
    }

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

    if (files.length > maxFiles) {
      res.status(400).json({
        success: false,
        error: `Too many files. Maximum ${maxFiles} files allowed`,
        code: 'TOO_MANY_FILES',
        timestamp: new Date().toISOString()
      });
      return;
    }

    for (const file of files) {
      if (file.size > maxSize) {
        res.status(400).json({
          success: false,
          error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'INVALID_FILE_TYPE',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    next();
  };
};
