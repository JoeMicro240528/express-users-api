import express from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordParamSchema
} from '../schemas/auth.schema.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: مسارات المصادقة وتسجيل الحسابات وإدارة الرموز
 */

// محدد معدل الطلبات لتسجيل الدخول (حماية من هجمات القوة الغاشمة Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // نافذة زمنية: 15 دقيقة
  max: 5, // الحد الأقصى: 5 محاولات لكل عنوان IP
  skipSuccessfulRequests: true, // عدم احتساب المحاولات الناجحة (الحد ينطبق فقط على الفاشلة)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة'
  }
});

// محدد معدل الطلبات لإنشاء الحسابات (منع إنشاء حسابات وهمية Spam / Bot)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // نافذة زمنية: 1 ساعة
  max: 10, // الحد الأقصى: 10 طلبات تسجيل فقط لكل عنوان IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى لإنشاء الحسابات من هذا الـ IP (10 حسابات كحد أقصى لكل ساعة)، يرجى المحاولة لاحقاً'
  }
});

// محدد معدل طلبات استعادة كلمة المرور (منع إغراق خادم البريد Spam)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // نافذة زمنية: 15 دقيقة
  max: 3, // الحد الأقصى: 3 طلبات لكل عنوان IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح به لطلبات استعادة كلمة المرور (3 طلبات كحد أقصى لكل 15 دقيقة)، يرجى المحاولة لاحقاً'
  }
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: تسجيل حساب مستخدم جديد
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ahmed Ali
 *               email:
 *                 type: string
 *                 example: ahmed@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               age:
 *                 type: number
 *                 example: 25
 *     responses:
 *       201:
 *         description: تم تسجيل الحساب بنجاح وتوليد Access Token و Refresh Token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: خطأ في التحقق من البيانات أو البريد مسجل مسبقاً
 *       429:
 *         description: تم تجاوز الحد الأقصى لإنشاء الحسابات
 */
router.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: تسجيل الدخول والحصول على Access Token و Refresh Token
 *     tags: [Auth]
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
 *                 example: ahmed@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: تم تسجيل الدخول بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: البريد الإلكتروني أو كلمة المرور غير صحيحة
 *       429:
 *         description: تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول
 */
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  authController.login
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: تجديد Access Token باستخدام Refresh Token صالح
 *     tags: [Auth]
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
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: تم تجديد التوكن بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: تم تجديد الـ Token بنجاح }
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: الـ Refresh Token مفقود
 *       403:
 *         description: الـ Refresh Token غير صالح أو تم إبطاله
 */
router.post(
  '/refresh-token',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: تسجيل الخروج وإبطال الـ Refresh Token
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: تم تسجيل الخروج وإبطال التوكن بنجاح
 *       401:
 *         description: غير مصرح
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: إرسال رابط استعادة كلمة المرور إلى البريد الإلكتروني
 *     tags: [Auth]
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
 *                 example: ahmed@example.com
 *     responses:
 *       200:
 *         description: تم إرسال رابط إعادة التعيين (أو رسالة موحدة لمنع استكشاف الإيميلات)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: إذا كان البريد الإلكتروني مسجلاً، فسيتم إرسال رابط إعادة تعيين كلمة المرور }
 *       400:
 *         description: بريد إلكتروني غير صالح
 *       429:
 *         description: تم تجاوز الحد الأقصى للطلبات
 */
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: إعادة تعيين كلمة المرور باستخدام الرمز
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: رمز استعادة كلمة المرور المستلم عبر البريد
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmPassword
 *             properties:
 *               password:
 *                 type: string
 *                 example: NewPassword123
 *               confirmPassword:
 *                 type: string
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: تم تغيير كلمة المرور بنجاح وتوليد رموز مصادقة جديدة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: الرمز غير صالح أو منتهي الصلاحية أو كلمات المرور غير متطابقة
 */
router.post(
  '/reset-password/:token',
  validate({
    params: resetPasswordParamSchema,
    body: resetPasswordSchema
  }),
  authController.resetPassword
);

// دعم طريقة PATCH أيضاً كبديل لـ POST لإعادة تعيين كلمة المرور
router.patch(
  '/reset-password/:token',
  validate({
    params: resetPasswordParamSchema,
    body: resetPasswordSchema
  }),
  authController.resetPassword
);

export { router };
export default router;
