import express from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';

const router = express.Router();

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

// POST /auth/register -> تسجيل حساب جديد (مع حماية Rate Limit بـ 10 طلبات)
router.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  authController.register
);

// POST /auth/login -> تسجيل الدخول (مع حماية Rate Limit)
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  authController.login
);

export { router };
export default router;
