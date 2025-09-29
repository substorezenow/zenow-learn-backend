import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Field } from '../models/Field';
import { Course } from '../models/Course';
import { ApiResponse, Category as CategoryType, Field as FieldType, Course as CourseType } from '../types';

// Mock data for development
const mockCategories: CategoryType[] = [
  {
    id: 1,
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
    id: 2,
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

// Categories Controller
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryModel = new Category();
    await categoryModel.connect();
    const categories = await categoryModel.getAllCategories();
    await categoryModel.close();
    
    const response: ApiResponse<CategoryType[]> = {
      success: true,
      data: categories,
      count: categories.length
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database unavailable, returning mock data:', (error as Error).message);
    // Return mock data when database is unavailable
    const response: ApiResponse<CategoryType[]> = {
      success: true,
      data: mockCategories,
      count: mockCategories.length
    };
    res.status(200).json(response);
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryModel = new Category();
    await categoryModel.connect();
    const category = await categoryModel.getCategoryById(parseInt(id));
    await categoryModel.close();
    
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
    await categoryModel.connect();
    const fields = await categoryModel.getFieldsByCategoryId(parseInt(id));
    await categoryModel.close();
    
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
    await fieldModel.connect();
    const fields = await fieldModel.getAllFields();
    await fieldModel.close();
    
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
    await fieldModel.connect();
    const field = await fieldModel.getFieldById(parseInt(id));
    await fieldModel.close();
    
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
    await fieldModel.connect();
    const courses = await fieldModel.getCoursesByFieldId(parseInt(id));
    await fieldModel.close();
    
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
    const courseModel = new Course();
    await courseModel.connect();
    const courses = await courseModel.getAllCourses(req.query);
    await courseModel.close();
    
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
    const courseModel = new Course();
    await courseModel.connect();
    const course = await courseModel.getCourseById(parseInt(id));
    await courseModel.close();
    
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
    await courseModel.connect();
    const course = await courseModel.getCourseBySlug(slug);
    await courseModel.close();
    
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
    
    const courseModel = new Course();
    await courseModel.connect();
    
    // Check if user is already enrolled
    const existingEnrollment = await courseModel.getUserEnrollment(userId, parseInt(id));
    if (existingEnrollment) {
      await courseModel.close();
      const response: ApiResponse = {
        success: false,
        error: 'User is already enrolled in this course'
      };
      res.status(400).json(response);
      return;
    }
    
    // Enroll user
    const enrollment = await courseModel.enrollUser(userId, parseInt(id));
    await courseModel.close();
    
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

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseData = {
      ...req.body,
      instructor_id: req.user!.id // Assuming user is authenticated
    };
    
    const courseModel = new Course();
    await courseModel.connect();
    const course = await courseModel.createCourse(courseData);
    await courseModel.close();
    
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
    await courseModel.connect();
    const course = await courseModel.updateCourse(parseInt(id), courseData);
    await courseModel.close();
    
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
