import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Field } from '../models/Field';
import { Course } from '../models/Course';
import { ApiResponse, Category as CategoryType, Field as FieldType, Course as CourseType } from '../types';
import { cacheManager } from '../utils/cacheManager';
import { gracefulDegradation } from '../utils/gracefulDegradation';
import { circuitBreakers } from '../utils/circuitBreaker';
import { logger } from '../utils/logger';
import handleSendEmail from '../services/emailService';

// Mock data for development
const mockCategories: CategoryType[] = [
  {
    id: "1",
    name: "Web Development",
    slug: "web-development",
    description: "Learn modern web development technologies",
    icon_url: "https://via.placeholder.com/40",
    banner_image: "https://via.placeholder.com/800x200",
    is_active: true,
    sort_order: 1,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    name: "Data Science",
    slug: "data-science",
    description: "Master data analysis and machine learning",
    icon_url: "https://via.placeholder.com/40",
    banner_image: "https://via.placeholder.com/800x200",
    is_active: true,
    sort_order: 2,
    created_at: "2024-01-16T10:30:00Z",
    updated_at: "2024-01-16T10:30:00Z"
  }
];

// Categories Controller with Circuit Breaker and Graceful Degradation
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    // Use graceful degradation service with circuit breaker protection
    const categories = await gracefulDegradation.getCategoriesWithFallback();
    
    const response: ApiResponse<CategoryType[]> = {
      success: true,
      data: categories,
      count: categories.length,
      timestamp: new Date().toISOString()
    };
    
    // Add resilience headers
    const dbStats = circuitBreakers.database.getStats();
    const cacheStats = circuitBreakers.cache.getStats();
    
    res.set('X-Database-Status', dbStats.state);
    res.set('X-Cache-Status', cacheStats.state);
    
    if (dbStats.state !== 'CLOSED') {
      res.set('X-System-Degraded', 'true');
      response.message = 'System operating in degraded mode - using fallback data';
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching categories', error as Error);
    
    // Final fallback to static mock data
    const response: ApiResponse<CategoryType[]> = {
      success: true,
      data: mockCategories,
      count: mockCategories.length,
      timestamp: new Date().toISOString(),
      message: 'Using static fallback data - system degraded'
    };
    
    res.set('X-System-Degraded', 'true');
    res.json(response);
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryModel = new Category();
    const category = await categoryModel.getCategoryById(id);
    
    if (!category) {
      const response: ApiResponse = {
        success: false,
        error: 'Category not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<CategoryType> = {
      success: true,
      data: category
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const getFieldsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryModel = new Category();
    const fields = await categoryModel.getFieldsByCategoryId(id);
    
    const response: ApiResponse<FieldType[]> = {
      success: true,
      data: fields,
      count: fields.length
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

// Fields Controller
export const getAllFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldModel = new Field();
    const fields = await fieldModel.getAllFields();
    
    const response: ApiResponse<FieldType[]> = {
      success: true,
      data: fields,
      count: fields.length
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const getFieldById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const fieldModel = new Field();
    // Handle large IDs by passing as string instead of parseInt
    const field = await fieldModel.getFieldById(id as any);
    
    if (!field) {
      const response: ApiResponse = {
        success: false,
        error: 'Field not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<FieldType> = {
      success: true,
      data: field
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const getCoursesByField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const fieldModel = new Field();
    const courses = await fieldModel.getCoursesByFieldId(id);
    
    const response: ApiResponse<CourseType[]> = {
      success: true,
      data: courses,
      count: courses.length
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

// Courses Controller
export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = req.query;
    
    // Try to get from cache first
    let courses = await cacheManager.getCachedCourses(filters);
    
    if (!courses) {
      // Cache miss - fetch from database
      const courseModel = new Course();
      courses = await courseModel.getAllCourses(filters);
      
      // Cache the result
      await cacheManager.cacheCourses(courses, filters);
    }
    
    const response: ApiResponse<CourseType[]> = {
      success: true,
      data: courses,
      count: courses.length
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Try to get from cache first
    let course = await cacheManager.getCachedCourse(parseInt(id));
    
    if (!course) {
      // Cache miss - fetch from database
      const courseModel = new Course();
      course = await courseModel.getCourseById(id);
      
      if (course) {
        // Cache the result
        await cacheManager.cacheCourse(parseInt(id), course);
      }
    }
    
    if (!course) {
      const response: ApiResponse = {
        success: false,
        error: 'Course not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<CourseType> = {
      success: true,
      data: course
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const getCourseBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const courseModel = new Course();
    const course = await courseModel.getCourseBySlug(slug);
    
    if (!course) {
      const response: ApiResponse = {
        success: false,
        error: 'Course not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<CourseType> = {
      success: true,
      data: course
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const enrollInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id; // Assuming user is authenticated
    const userEmail = req.user!.email;
    
    const courseModel = new Course();
    
    // Check if user is already enrolled
    const existingEnrollment = await courseModel.getUserEnrollment(userId, id);
    if (existingEnrollment) {
      const response: ApiResponse = {
        success: true,
        data: existingEnrollment,
        message: 'User is already enrolled in this course'
      };
      res.status(200).json(response);
      return;
    }
    
    // Enroll user
    const enrollment = await courseModel.enrollUser(userId, id);

    // Fire-and-forget enrollment confirmation email
    try {
      const course = await courseModel.getCourseById(id);
      if (userEmail && course) {
        const html = `<html><body style=\"margin:0; padding:0; background:#f5f7fa; font-family:Arial, Helvetica, sans-serif;\"><div style=\"max-width:600px; margin:30px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.06);\"><div style=\"background:#1e3a8a; padding:22px; text-align:center;\"><img src=\"https://academy.zenow.in/zenow-academy-logo-medium.svg\" alt=\"Zenow Academy\" style=\"width:180px; filter:brightness(0) invert(1);\" /></div><div style=\"padding:30px; color:#333;\"><h2 style=\"color:#1e3a8a; margin-bottom:14px; text-align:center; font-size:24px;\">Enrollment Confirmed</h2><p style=\"font-size:15px; line-height:24px;\">You have successfully enrolled in <strong>${course.title}</strong>.</p><p style=\"font-size:15px; line-height:24px;\">We wish you a great learning journey!</p><div style=\"text-align:center; margin-top:25px;\"><a href=\"https://academy.zenow.in\" style=\"display:inline-block; padding:12px 24px; background:#1e3a8a; color:white; text-decoration:none; border-radius:8px; font-size:16px;\">Go to Dashboard</a></div></div><div style=\"background:#f1f1f1; padding:15px; text-align:center; color:#888; font-size:13px;\">© 2025 Zenow Academy. All rights reserved.</div></div></body></html>`;
        handleSendEmail(userEmail, `Enrollment Confirmed - ${course.title}`, html).catch(() => {});
      }
    } catch {}
    
    const response: ApiResponse = {
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course'
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const getEnrollmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id; // Assuming user is authenticated
    
    const courseModel = new Course();
    
    // Check if user is enrolled
    const enrollment = await courseModel.getUserEnrollment(userId, id);
    
    const response: ApiResponse = {
      success: true,
      data: {
        isEnrolled: !!enrollment,
        enrollment: enrollment || null
      }
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseData = {
      ...req.body,
      instructor_id: req.user!.id // Assuming user is authenticated
    };
    
    const courseModel = new Course();
    const course = await courseModel.createCourse(courseData);
    
    const response: ApiResponse<CourseType> = {
      success: true,
      data: course,
      message: 'Course created successfully'
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const courseData = req.body;
    
    const courseModel = new Course();
    const course = await courseModel.updateCourse(parseInt(id), courseData);
    
    const response: ApiResponse<CourseType> = {
      success: true,
      data: course,
      message: 'Course updated successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  }
};
