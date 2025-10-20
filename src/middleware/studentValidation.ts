import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Student registration validation schema
const studentRegistrationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  first_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  
  last_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 100 characters',
      'any.required': 'Last name is required'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .min(10)
    .max(20)
    .allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters long',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
  
  date_of_birth: Joi.date()
    .max('now')
    .allow('', null)
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .allow('', null)
    .messages({
      'any.only': 'Gender must be one of: male, female, other'
    }),
  
  country: Joi.string()
    .max(100)
    .allow('', null)
    .messages({
      'string.max': 'Country name cannot exceed 100 characters'
    }),
  
  city: Joi.string()
    .max(100)
    .allow('', null)
    .messages({
      'string.max': 'City name cannot exceed 100 characters'
    })
});

// Student login validation schema
const studentLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  
  fingerprint: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'Fingerprint must be a string'
    })
});

/**
 * Validate student registration data
 */
export const validateStudentRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = studentRegistrationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
    return;
  }

  // Replace empty strings with null for optional fields
  const cleanedData = {
    ...value,
    phone: value.phone === '' ? null : value.phone,
    date_of_birth: value.date_of_birth === '' ? null : value.date_of_birth,
    gender: value.gender === '' ? null : value.gender,
    country: value.country === '' ? null : value.country,
    city: value.city === '' ? null : value.city
  };

  req.body = cleanedData;
  next();
};

/**
 * Validate student login data
 */
export const validateStudentLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = studentLoginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
    return;
  }

  req.body = value;
  next();
};
