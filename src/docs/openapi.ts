import { OpenAPIV3 } from 'openapi-types';
import { Request, Response } from 'express';

/**
 * OpenAPI 3.0 specification for Zenow Learn Backend API
 * Comprehensive API documentation with all endpoints, schemas, and examples
 */
export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Zenow Learn Backend API',
    version: '1.0.0',
    description: 'Enterprise-grade educational platform backend API with comprehensive course management, security monitoring, and user management features.',
    contact: {
      name: 'Zenow Development Team',
      email: 'dev@zenow.com',
      url: 'https://zenow.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:8080/api',
      description: 'Development server'
    },
    {
      url: 'https://api.zenow.com/api',
      description: 'Production server'
    }
  ],
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the application and all its services',
        security: [],
        responses: {
          '200': {
            description: 'Application is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    security: {
                      type: 'object',
                      properties: {
                        sessionManagement: { type: 'boolean' },
                        rateLimiting: { type: 'boolean' },
                        securityMonitoring: { type: 'boolean' },
                        csrfProtection: { type: 'boolean' },
                        enhancedHeaders: { type: 'boolean' }
                      }
                    },
                    cache: {
                      type: 'object',
                      properties: {
                        redis: { type: 'boolean' },
                        status: { type: 'string', enum: ['connected', 'disconnected'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get all categories',
        description: 'Retrieve all active categories with their associated fields and course counts',
        responses: {
          '200': {
            description: 'Categories retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiResponse'
                },
                example: {
                  success: true,
                  data: [
                    {
                      id: 1,
                      name: 'Web Development',
                      slug: 'web-development',
                      description: 'Learn modern web development technologies',
                      icon_url: 'https://example.com/icons/web-dev.png',
                      banner_image: 'https://example.com/banners/web-dev.jpg',
                      is_active: true,
                      sort_order: 1,
                      created_at: '2024-01-15T10:30:00Z',
                      updated_at: '2024-01-15T10:30:00Z'
                    }
                  ],
                  count: 1
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category by ID',
        description: 'Retrieve a specific category by its ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Category ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          }
        ],
        responses: {
          '200': {
            description: 'Category retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Category' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/fields': {
      get: {
        tags: ['Fields'],
        summary: 'Get all fields',
        description: 'Retrieve all active fields with their category information and course counts',
        responses: {
          '200': {
            description: 'Fields retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Field' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/fields/{id}': {
      get: {
        tags: ['Fields'],
        summary: 'Get field by ID',
        description: 'Retrieve a specific field by its ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Field ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          }
        ],
        responses: {
          '200': {
            description: 'Field retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Field' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': {
            description: 'Field not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/courses': {
      get: {
        tags: ['Courses'],
        summary: 'Get all courses',
        description: 'Retrieve all published courses with filtering and pagination options',
        parameters: [
          {
            name: 'category_id',
            in: 'query',
            description: 'Filter by category ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          },
          {
            name: 'field_id',
            in: 'query',
            description: 'Filter by field ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          },
          {
            name: 'difficulty_level',
            in: 'query',
            description: 'Filter by difficulty level',
            schema: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced']
            }
          },
          {
            name: 'is_free',
            in: 'query',
            description: 'Filter by free courses',
            schema: {
              type: 'boolean'
            }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search in course title and description',
            schema: {
              type: 'string',
              maxLength: 100
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of courses to return',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1
            }
          }
        ],
        responses: {
          '200': {
            description: 'Courses retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Course' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/courses/{id}': {
      get: {
        tags: ['Courses'],
        summary: 'Get course by ID',
        description: 'Retrieve a specific course by its ID with full details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Course ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          }
        ],
        responses: {
          '200': {
            description: 'Course retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Course' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': {
            description: 'Course not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/courses/{id}/enroll': {
      post: {
        tags: ['Courses'],
        summary: 'Enroll in course',
        description: 'Enroll the authenticated user in a specific course',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Course ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          }
        ],
        responses: {
          '201': {
            description: 'Successfully enrolled in course',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Enrollment' },
                        message: { type: 'string', example: 'Successfully enrolled in course' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': {
            description: 'Already enrolled or validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user with username/email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: {
                    type: 'string',
                    description: 'Username or email address',
                    example: 'john.doe@example.com'
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    description: 'User password',
                    example: 'securePassword123'
                  },
                  fingerprint: {
                    type: 'string',
                    description: 'Client fingerprint for session security',
                    example: 'browser_fingerprint_hash'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/AuthUser' },
                            token: {
                              type: 'string',
                              description: 'JWT access token',
                              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            },
                            refreshToken: {
                              type: 'string',
                              description: 'JWT refresh token',
                              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '429': {
            description: 'Too many login attempts',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Register a new user account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'email'],
                properties: {
                  username: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 50,
                    pattern: '^[a-zA-Z0-9_]+$',
                    description: 'Unique username',
                    example: 'johndoe'
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    maxLength: 100,
                    format: 'password',
                    description: 'User password',
                    example: 'securePassword123'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                    example: 'john.doe@example.com'
                  },
                  first_name: {
                    type: 'string',
                    maxLength: 50,
                    description: 'User first name',
                    example: 'John'
                  },
                  last_name: {
                    type: 'string',
                    maxLength: 50,
                    description: 'User last name',
                    example: 'Doe'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/AuthUser' },
                        message: { type: 'string', example: 'User registered successfully' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': {
            description: 'Validation error or user already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/admin/security-dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Security dashboard',
        description: 'Get comprehensive security metrics and monitoring data (Admin only)',
        responses: {
          '200': {
            description: 'Security dashboard data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    recentEvents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          event_type: { type: 'string' },
                          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                          ip_address: { type: 'string' },
                          created_at: { type: 'string', format: 'date-time' }
                        }
                      }
                    },
                    blockedIPs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          ip_address: { type: 'string' },
                          reason: { type: 'string' },
                          blocked_at: { type: 'string', format: 'date-time' },
                          expires_at: { type: 'string', format: 'date-time' }
                        }
                      }
                    },
                    suspiciousActivities: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          ip_address: { type: 'string' },
                          event_count: { type: 'integer' },
                          event_types: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    },
                    topEventTypes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          event_type: { type: 'string' },
                          count: { type: 'integer' },
                          severity: { type: 'string' }
                        }
                      }
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        totalEvents24h: { type: 'integer' },
                        blockedIPsCount: { type: 'integer' },
                        suspiciousIPsCount: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful'
          },
          data: {
            description: 'Response data (varies by endpoint)'
          },
          message: {
            type: 'string',
            description: 'Optional success message'
          },
          count: {
            type: 'integer',
            description: 'Number of items returned (for list endpoints)'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp'
          }
        },
        required: ['success', 'timestamp']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error message'
          },
          code: {
            type: 'string',
            description: 'Error code for programmatic handling'
          },
          details: {
            description: 'Additional error details (varies by error type)'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          },
          path: {
            type: 'string',
            description: 'Request path that caused the error'
          },
          method: {
            type: 'string',
            description: 'HTTP method that caused the error'
          }
        },
        required: ['success', 'error', 'timestamp']
      },
      Category: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique category identifier'
          },
          name: {
            type: 'string',
            description: 'Category name',
            example: 'Web Development'
          },
          slug: {
            type: 'string',
            description: 'URL-friendly category identifier',
            example: 'web-development'
          },
          description: {
            type: 'string',
            description: 'Category description',
            example: 'Learn modern web development technologies'
          },
          icon_url: {
            type: 'string',
            format: 'uri',
            description: 'Category icon URL',
            example: 'https://example.com/icons/web-dev.png'
          },
          banner_image: {
            type: 'string',
            format: 'uri',
            description: 'Category banner image URL',
            example: 'https://example.com/banners/web-dev.jpg'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether the category is active',
            example: true
          },
          sort_order: {
            type: 'integer',
            description: 'Sort order for display',
            example: 1
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'name', 'slug', 'description', 'is_active', 'sort_order', 'created_at', 'updated_at']
      },
      Field: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique field identifier'
          },
          name: {
            type: 'string',
            description: 'Field name',
            example: 'React Development'
          },
          slug: {
            type: 'string',
            description: 'URL-friendly field identifier',
            example: 'react-development'
          },
          description: {
            type: 'string',
            description: 'Field description',
            example: 'Master React.js for building modern web applications'
          },
          icon_url: {
            type: 'string',
            format: 'uri',
            description: 'Field icon URL'
          },
          banner_image: {
            type: 'string',
            format: 'uri',
            description: 'Field banner image URL'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether the field is active'
          },
          sort_order: {
            type: 'integer',
            description: 'Sort order for display'
          },
          category_id: {
            type: 'integer',
            description: 'Parent category ID'
          },
          category_name: {
            type: 'string',
            description: 'Parent category name'
          },
          category_slug: {
            type: 'string',
            description: 'Parent category slug'
          },
          course_count: {
            type: 'integer',
            description: 'Number of courses in this field'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'name', 'slug', 'description', 'is_active', 'sort_order', 'category_id', 'created_at', 'updated_at']
      },
      Course: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique course identifier'
          },
          title: {
            type: 'string',
            description: 'Course title',
            example: 'Complete React Developer Course'
          },
          slug: {
            type: 'string',
            description: 'URL-friendly course identifier',
            example: 'complete-react-developer-course'
          },
          description: {
            type: 'string',
            description: 'Detailed course description'
          },
          short_description: {
            type: 'string',
            description: 'Brief course description',
            maxLength: 500
          },
          banner_image: {
            type: 'string',
            format: 'uri',
            description: 'Course banner image URL'
          },
          thumbnail_image: {
            type: 'string',
            format: 'uri',
            description: 'Course thumbnail image URL'
          },
          duration_hours: {
            type: 'integer',
            description: 'Course duration in hours',
            example: 40
          },
          difficulty_level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Course difficulty level',
            example: 'intermediate'
          },
          price: {
            type: 'number',
            format: 'decimal',
            description: 'Course price',
            example: 99.99
          },
          is_free: {
            type: 'boolean',
            description: 'Whether the course is free',
            example: false
          },
          is_published: {
            type: 'boolean',
            description: 'Whether the course is published',
            example: true
          },
          field_id: {
            type: 'integer',
            description: 'Parent field ID'
          },
          field_name: {
            type: 'string',
            description: 'Parent field name'
          },
          field_slug: {
            type: 'string',
            description: 'Parent field slug'
          },
          category_name: {
            type: 'string',
            description: 'Parent category name'
          },
          category_slug: {
            type: 'string',
            description: 'Parent category slug'
          },
          instructor_id: {
            type: 'string',
            format: 'uuid',
            description: 'Course instructor ID'
          },
          instructor_name: {
            type: 'string',
            description: 'Course instructor name'
          },
          instructor_email: {
            type: 'string',
            format: 'email',
            description: 'Course instructor email'
          },
          prerequisites: {
            type: 'string',
            description: 'Course prerequisites'
          },
          learning_outcomes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Expected learning outcomes'
          },
          course_modules: {
            type: 'array',
            items: { $ref: '#/components/schemas/CourseModule' },
            description: 'Course modules'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Course tags'
          },
          rating: {
            type: 'number',
            format: 'decimal',
            description: 'Average course rating',
            example: 4.5
          },
          total_ratings: {
            type: 'integer',
            description: 'Total number of ratings',
            example: 150
          },
          enrolled_students: {
            type: 'integer',
            description: 'Number of enrolled students',
            example: 1200
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'title', 'slug', 'description', 'field_id', 'price', 'is_free', 'is_published', 'created_at', 'updated_at']
      },
      CourseModule: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique module identifier'
          },
          course_id: {
            type: 'integer',
            description: 'Parent course ID'
          },
          title: {
            type: 'string',
            description: 'Module title',
            example: 'Introduction to React Components'
          },
          description: {
            type: 'string',
            description: 'Module description'
          },
          content_type: {
            type: 'string',
            enum: ['video', 'text', 'quiz', 'assignment'],
            description: 'Type of content',
            example: 'video'
          },
          content_url: {
            type: 'string',
            format: 'uri',
            description: 'Content URL'
          },
          duration_minutes: {
            type: 'integer',
            description: 'Module duration in minutes',
            example: 45
          },
          sort_order: {
            type: 'integer',
            description: 'Display order',
            example: 1
          },
          is_free: {
            type: 'boolean',
            description: 'Whether the module is free'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'course_id', 'title', 'content_type', 'sort_order', 'is_free', 'created_at', 'updated_at']
      },
      Enrollment: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique enrollment identifier'
          },
          user_id: {
            type: 'integer',
            description: 'Enrolled user ID'
          },
          course_id: {
            type: 'integer',
            description: 'Enrolled course ID'
          },
          enrollment_type: {
            type: 'string',
            enum: ['course', 'bundle'],
            description: 'Type of enrollment',
            example: 'course'
          },
          enrollment_date: {
            type: 'string',
            format: 'date-time',
            description: 'Enrollment date'
          },
          completion_percentage: {
            type: 'number',
            format: 'decimal',
            description: 'Course completion percentage',
            example: 75.5
          },
          last_accessed: {
            type: 'string',
            format: 'date-time',
            description: 'Last access timestamp'
          },
          is_completed: {
            type: 'boolean',
            description: 'Whether the course is completed'
          },
          completion_date: {
            type: 'string',
            format: 'date-time',
            description: 'Course completion date'
          }
        },
        required: ['id', 'user_id', 'course_id', 'enrollment_type', 'enrollment_date', 'completion_percentage', 'is_completed']
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'User ID'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          role: {
            type: 'string',
            enum: ['student', 'instructor', 'admin', 'superuser'],
            description: 'User role',
            example: 'student'
          }
        },
        required: ['id', 'email', 'role']
      }
    }
  }
};

/**
 * Swagger UI configuration
 */
export const swaggerConfig = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Zenow Learn API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
};

/**
 * Serve OpenAPI specification
 */
export const serveOpenApiSpec = (req: Request, res: Response): void => {
  res.json(openApiSpec);
};
