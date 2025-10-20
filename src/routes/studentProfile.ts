import { Router } from "express";
import { authenticateStudent } from "../middleware/studentAuth";
import {
  getStudentProfile,
  updateStudentProfile,
  changePassword,
  uploadProfileImage
} from "../controllers/studentProfileController";

const router = Router();

/**
 * @swagger
 * /student/profile:
 *   get:
 *     summary: Get current student's profile
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     student_id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     date_of_birth:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                       enum: [male, female, other]
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     country:
 *                       type: string
 *                     postal_code:
 *                       type: string
 *                     emergency_contact_name:
 *                       type: string
 *                     emergency_contact_phone:
 *                       type: string
 *                     emergency_contact_relation:
 *                       type: string
 *                     profile_image:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     interests:
 *                       type: array
 *                       items:
 *                         type: string
 *                     learning_goals:
 *                       type: string
 *                     preferred_language:
 *                       type: string
 *                     timezone:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *                     email_verified:
 *                       type: boolean
 *                     phone_verified:
 *                       type: boolean
 *                     profile_completed:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     last_login:
 *                       type: string
 *                       format: date-time
 *                     enrolled_courses:
 *                       type: number
 *                     completed_courses:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.get("/profile", authenticateStudent, getStudentProfile);

/**
 * @swagger
 * /student/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               emergency_contact_name:
 *                 type: string
 *               emergency_contact_phone:
 *                 type: string
 *               emergency_contact_relation:
 *                 type: string
 *               bio:
 *                 type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               learning_goals:
 *                 type: string
 *               preferred_language:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.put("/profile", authenticateStudent, updateStudentProfile);

/**
 * @swagger
 * /student/change-password:
 *   post:
 *     summary: Change student password
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/change-password", authenticateStudent, changePassword);

/**
 * @swagger
 * /student/upload-profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profile_image_url
 *             properties:
 *               profile_image_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile_image:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/upload-profile-image", authenticateStudent, uploadProfileImage);

export default router;
