import express from 'express';
import authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';

const router = express.Router();

// POST /auth/register -> تسجيل حساب جديد
router.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register
);

// POST /auth/login -> تسجيل الدخول
router.post(
  '/login',
  validate({ body: loginSchema }),
  authController.login
);

export { router };
export default router;
