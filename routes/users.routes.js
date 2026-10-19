import express from 'express';
import usersController from '../controllers/users.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  userIdParamSchema
} from '../schemas/users.schema.js';

const router = express.Router();

// 🔒 تفعيل وسيط الحماية على جميع مسارات المستخدمين
// كل مسار بعد هذا السطر يتطلب وجود Token صالح في ترويسة Authorization
router.use(protect);

// GET /users/me -> جلب الملف الشخصي للمستخدم المسجل دخوله حالياً
router.get('/me', usersController.getMe);

// GET /users -> جلب المستخدمين (للمستخدمين المسجلين فقط مع دعم Search و Filter و Pagination)
router.get('/', validate({ query: getUsersQuerySchema }), usersController.getAllUsers);

// GET /users/:id -> جلب مستخدم محدد بواسطة الـ ID
router.get('/:id', validate({ params: userIdParamSchema }), usersController.getUserById);

// POST /users -> إضافة مستخدم جديد (متاح فقط للمشرف admin)
router.post(
  '/',
  restrictTo('admin'),
  validate({ body: createUserSchema }),
  usersController.createUser
);

// PATCH /users/:id -> تعديل بيانات مستخدم (Partial Update)
router.patch(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

// PUT /users/:id -> تعديل بيانات مستخدم
router.put(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

// DELETE /users/:id -> حذف مستخدم (متاح فقط للمشرف admin)
router.delete(
  '/:id',
  restrictTo('admin'),
  validate({ params: userIdParamSchema }),
  usersController.deleteUser
);

export { router };
export default router;
