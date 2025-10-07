import { Request, Response } from 'express';
import { dbManager } from '../utils/databaseManager';
import { ApiResponse, Course as CourseType, Enrollment } from '../types';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Enhanced payment service with multiple payment providers
 * Maintains exact same input/output interfaces while adding payment processing
 */
export class PaymentService {
  private stripe: any;
  private paypal: any;

  constructor() {
    // Initialize payment providers
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
    
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.paypal = require('@paypal/checkout-server-sdk');
    }
  }

  /**
   * Process course payment with Stripe
   * New method - doesn't change existing interfaces
   */
  async processStripePayment(
    courseId: number,
    userId: number,
    paymentMethodId: string,
    amount: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          courseId: courseId.toString(),
          userId: userId.toString()
        }
      });

      if (paymentIntent.status === 'succeeded') {
        // Log successful payment
        logger.info('Stripe Payment Successful', {
          paymentIntentId: paymentIntent.id,
          courseId,
          userId,
          amount
        });

        return {
          success: true,
          transactionId: paymentIntent.id
        };
      } else {
        return {
          success: false,
          error: 'Payment failed'
        };
      }
    } catch (error) {
      logger.error('Stripe Payment Error', error as Error, {
        courseId,
        userId,
        amount
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Process PayPal payment
   * New method - doesn't change existing interfaces
   */
  async processPayPalPayment(
    courseId: number,
    userId: number,
    orderId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.paypal) {
        throw new Error('PayPal not configured');
      }

      // Verify PayPal order
      const order = await this.paypal.orders.get(orderId);
      
      if (order.status === 'COMPLETED') {
        logger.info('PayPal Payment Successful', {
          orderId,
          courseId,
          userId
        });

        return {
          success: true,
          transactionId: orderId
        };
      } else {
        return {
          success: false,
          error: 'Payment not completed'
        };
      }
    } catch (error) {
      logger.error('PayPal Payment Error', error as Error, {
        courseId,
        userId,
        orderId
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Create payment record in database
   * New method - doesn't change existing interfaces
   */
  async createPaymentRecord(
    userId: number,
    courseId: number,
    amount: number,
    paymentMethod: string,
    transactionId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<any> {
    try {
      const result = await dbManager.query(
        `INSERT INTO payments (user_id, course_id, amount, payment_method, transaction_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [userId, courseId, amount, paymentMethod, transactionId, status]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Payment Record Creation Error', error as Error, {
        userId,
        courseId,
        amount,
        paymentMethod,
        transactionId
      });
      throw error;
    }
  }

  /**
   * Process refund
   * New method - doesn't change existing interfaces
   */
  async processRefund(paymentId: number, reason: string): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      // Get payment details
      const paymentResult = await dbManager.query(
        'SELECT * FROM payments WHERE id = $1',
        [paymentId]
      );

      if (paymentResult.rows.length === 0) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      const payment = paymentResult.rows[0];

      let refundId: string;

      if (payment.payment_method === 'stripe' && this.stripe) {
        // Process Stripe refund
        const refund = await this.stripe.refunds.create({
          payment_intent: payment.transaction_id,
          reason: 'requested_by_customer'
        });
        refundId = refund.id;
      } else if (payment.payment_method === 'paypal' && this.paypal) {
        // Process PayPal refund
        const refund = await this.paypal.payments.refund(payment.transaction_id, {
          amount: {
            total: payment.amount.toString(),
            currency: 'USD'
          }
        });
        refundId = refund.id;
      } else {
        return {
          success: false,
          error: 'Refund not supported for this payment method'
        };
      }

      // Update payment status
      await dbManager.query(
        'UPDATE payments SET status = $1, refund_id = $2, refund_reason = $3, refunded_at = NOW() WHERE id = $4',
        ['refunded', refundId, reason, paymentId]
      );

      logger.info('Refund Processed', {
        paymentId,
        refundId,
        reason,
        amount: payment.amount
      });

      return {
        success: true,
        refundId
      };
    } catch (error) {
      logger.error('Refund Processing Error', error as Error, {
        paymentId,
        reason
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

/**
 * Enhanced course controller with payment integration
 * Maintains exact same input/output interfaces while adding payment features
 */
export class EnhancedCourseController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Enhanced course enrollment with payment processing
   * Input/Output interface remains exactly the same
   */
  async enrollInCourse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user!.id;
      const { paymentMethod, paymentData } = req.body; // Additional fields for payment

      // Get course details
      const courseResult = await dbManager.query(
        'SELECT * FROM courses WHERE id = $1 AND is_published = true',
        [id]
      );

      if (courseResult.rows.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Course not found'
        };
        res.status(404).json(response);
        return;
      }

      const course = courseResult.rows[0];

      // Check if user is already enrolled
      const existingEnrollment = await dbManager.query(
        'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, id]
      );

      if (existingEnrollment.rows.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: 'User is already enrolled in this course'
        };
        res.status(400).json(response);
        return;
      }

      // Process payment if course is not free
      let paymentRecord = null;
      if (!course.is_free && course.price > 0) {
        if (!paymentMethod || !paymentData) {
          const response: ApiResponse = {
            success: false,
            error: 'Payment information required for paid courses'
          };
          res.status(400).json(response);
          return;
        }

        // Process payment based on method
        let paymentResult;
        if (paymentMethod === 'stripe') {
          paymentResult = await this.paymentService.processStripePayment(
            parseInt(id),
            userId,
            paymentData.paymentMethodId,
            course.price
          );
        } else if (paymentMethod === 'paypal') {
          paymentResult = await this.paymentService.processPayPalPayment(
            parseInt(id),
            userId,
            paymentData.orderId
          );
        } else {
          const response: ApiResponse = {
            success: false,
            error: 'Unsupported payment method'
          };
          res.status(400).json(response);
          return;
        }

        if (!paymentResult.success) {
          const response: ApiResponse = {
            success: false,
            error: paymentResult.error || 'Payment failed'
          };
          res.status(400).json(response);
          return;
        }

        // Create payment record
        paymentRecord = await this.paymentService.createPaymentRecord(
          userId,
          parseInt(id),
          course.price,
          paymentMethod,
          paymentResult.transactionId!,
          'completed'
        );
      }

      // Create enrollment
      const enrollmentResult = await dbManager.query(
        `INSERT INTO enrollments (user_id, course_id, enrollment_type, enrollment_date, completion_percentage, is_completed)
         VALUES ($1, $2, 'course', NOW(), 0, false)
         RETURNING *`,
        [userId, id]
      );

      const enrollment = enrollmentResult.rows[0];

      // Log enrollment
      logger.info('Course Enrollment', {
        userId,
        courseId: id,
        courseTitle: course.title,
        paymentId: paymentRecord?.id,
        amount: course.price
      });

      // Return same interface as before
      const response: ApiResponse<Enrollment> = {
        success: true,
        data: enrollment,
        message: 'Successfully enrolled in course'
      };
      res.status(201).json(response);

    } catch (error) {
      logger.error('Course Enrollment Error', error as Error, {
        courseId: req.params.id,
        userId: (req as any).user?.id
      });

      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get course progress with enhanced analytics
   * New method - doesn't change existing interfaces
   */
  async getCourseProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user!.id;

      // Get enrollment and progress
      const progressResult = await dbManager.query(
        `SELECT e.*, c.title as course_title, c.duration_hours,
         COUNT(cm.id) as total_modules,
         COUNT(cp.module_id) as completed_modules
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN course_modules cm ON c.id = cm.course_id
         LEFT JOIN course_progress cp ON e.id = cp.enrollment_id AND cm.id = cp.module_id AND cp.is_completed = true
         WHERE e.user_id = $1 AND e.course_id = $2
         GROUP BY e.id, c.title, c.duration_hours`,
        [userId, id]
      );

      if (progressResult.rows.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Enrollment not found'
        };
        res.status(404).json(response);
        return;
      }

      const progress = progressResult.rows[0];
      const completionPercentage = progress.total_modules > 0 
        ? Math.round((progress.completed_modules / progress.total_modules) * 100)
        : 0;

      const response: ApiResponse = {
        success: true,
        data: {
          enrollment: progress,
          progress: {
            completedModules: parseInt(progress.completed_modules),
            totalModules: parseInt(progress.total_modules),
            completionPercentage,
            estimatedTimeRemaining: Math.round(
              (progress.duration_hours * (100 - completionPercentage)) / 100
            )
          }
        }
      };
      res.status(200).json(response);

    } catch (error) {
      logger.error('Course Progress Error', error as Error, {
        courseId: req.params.id,
        userId: (req as any).user?.id
      });

      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update course progress
   * New method - doesn't change existing interfaces
   */
  async updateCourseProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { moduleId, isCompleted, timeSpent, lastPosition } = req.body;
      const userId = (req as any).user!.id;

      // Verify enrollment
      const enrollmentResult = await dbManager.query(
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, id]
      );

      if (enrollmentResult.rows.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Enrollment not found'
        };
        res.status(404).json(response);
        return;
      }

      const enrollmentId = enrollmentResult.rows[0].id;

      // Update or create progress record
      await dbManager.query(
        `INSERT INTO course_progress (enrollment_id, module_id, is_completed, completion_date, time_spent_minutes, last_position_seconds, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (enrollment_id, module_id)
         DO UPDATE SET 
           is_completed = $3,
           completion_date = CASE WHEN $3 = true THEN NOW() ELSE course_progress.completion_date END,
           time_spent_minutes = $5,
           last_position_seconds = $6,
           updated_at = NOW()`,
        [
          enrollmentId,
          moduleId,
          isCompleted,
          isCompleted ? new Date() : null,
          timeSpent || 0,
          lastPosition || 0
        ]
      );

      // Update overall enrollment progress
      const progressResult = await dbManager.query(
        `SELECT 
           COUNT(cm.id) as total_modules,
           COUNT(cp.module_id) as completed_modules
         FROM course_modules cm
         LEFT JOIN course_progress cp ON cm.id = cp.module_id AND cp.enrollment_id = $1 AND cp.is_completed = true
         WHERE cm.course_id = $2`,
        [enrollmentId, id]
      );

      const progress = progressResult.rows[0];
      const completionPercentage = progress.total_modules > 0 
        ? Math.round((progress.completed_modules / progress.total_modules) * 100)
        : 0;

      const isCourseCompleted = completionPercentage === 100;

      await dbManager.query(
        'UPDATE enrollments SET completion_percentage = $1, is_completed = $2, completion_date = $3 WHERE id = $4',
        [
          completionPercentage,
          isCourseCompleted,
          isCourseCompleted ? new Date() : null,
          enrollmentId
        ]
      );

      logger.info('Course Progress Updated', {
        userId,
        courseId: id,
        moduleId,
        isCompleted,
        completionPercentage
      });

      const response: ApiResponse = {
        success: true,
        data: {
          completionPercentage,
          isCourseCompleted
        },
        message: 'Progress updated successfully'
      };
      res.status(200).json(response);

    } catch (error) {
      logger.error('Course Progress Update Error', error as Error, {
        courseId: req.params.id,
        userId: (req as any).user?.id
      });

      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get user's enrolled courses with progress
   * New method - doesn't change existing interfaces
   */
  async getUserEnrollments(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user!.id;
      const { status, limit = 20, page = 1 } = req.query;

      let whereClause = 'WHERE e.user_id = $1';
      const queryParams: any[] = [userId];
      let paramCount = 1;

      if (status === 'completed') {
        whereClause += ` AND e.is_completed = true`;
      } else if (status === 'in_progress') {
        whereClause += ` AND e.is_completed = false AND e.completion_percentage > 0`;
      } else if (status === 'not_started') {
        whereClause += ` AND e.completion_percentage = 0`;
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const enrollmentsResult = await dbManager.query(
        `SELECT e.*, c.title, c.slug, c.banner_image, c.duration_hours, c.difficulty_level,
         f.name as field_name, cat.name as category_name
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         JOIN fields f ON c.field_id = f.id
         JOIN categories cat ON f.category_id = cat.id
         ${whereClause}
         ORDER BY e.enrollment_date DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...queryParams, parseInt(limit as string), offset]
      );

      const response: ApiResponse = {
        success: true,
        data: enrollmentsResult.rows,
        count: enrollmentsResult.rows.length
      };
      res.status(200).json(response);

    } catch (error) {
      logger.error('User Enrollments Error', error as Error, {
        userId: (req as any).user?.id
      });

      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }
}

// Export singleton instance
export const enhancedCourseController = new EnhancedCourseController();
export const paymentService = new PaymentService();
