import { Router } from "express";
import { studentAuthService } from "../services/studentAuthService";
import {
  validateStudentRegistration,
  validateStudentLogin,
} from "../middleware/studentValidation";

const router = Router();

/**
 * @swagger
 * /student-auth/register:
 *   post:
 *     summary: Register a new student
 *     tags: [Student Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
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
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       type: object
 *                     tokens:
 *                       type: object
 *       400:
 *         description: Bad request
 *       429:
 *         description: Too many requests
 */
router.post("/register", validateStudentRegistration, (req, res) => {
  studentAuthService.register(req, res);
});

/**
 * @swagger
 * /student-auth/login:
 *   post:
 *     summary: Login student
 *     tags: [Student Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               fingerprint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       type: object
 *                     tokens:
 *                       type: object
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 *       429:
 *         description: Too many requests
 */
router.post("/login", validateStudentLogin, (req, res) => {
  studentAuthService.login(req, res);
});

/**
 * @swagger
 * /student-auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Student Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh", (req, res) => {
  studentAuthService.refreshToken(req, res);
});

/**
 * @swagger
 * /student-auth/session-verify:
 *   post:
 *     summary: Verify student session
 *     tags: [Student Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Invalid or expired token
 */
router.post("/session-verify", (req, res) => {
  studentAuthService.verifySession(req, res);
});

/**
 * @swagger
 * /student-auth/logout:
 *   post:
 *     summary: Logout student
 *     tags: [Student Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", (req, res) => {
  studentAuthService.logout(req, res);
});

/**
 * @swagger
 * /student-auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Student Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 */
router.post("/forgot-password", (req, res) => {
  studentAuthService.forgotPassword(req, res);
});

/**
 * @swagger
 * /student-auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Student Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", (req, res) => {
  studentAuthService.resetPassword(req, res);
});

export default router;
