import express from 'express';
import usersController from '../controllers/users.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  userIdParamSchema
} from '../schemas/users.schema.js';

const router = express.Router();

// GET / -> جلب المستخدمين مع التحقق من معلمات البحث والتصفية والترقيم (Query Params)
router.get('/', validate({ query: getUsersQuerySchema }), usersController.getAllUsers);

// GET /:id -> جلب مستخدم محدد مع التحقق من المعرف
router.get('/:id', validate({ params: userIdParamSchema }), usersController.getUserById);

// POST / -> إضافة مستخدم جديد مع التحقق من البيانات المدخلة
router.post('/', validate({ body: createUserSchema }), usersController.createUser);

// PATCH /:id -> تعديل بيانات مستخدم (Partial Update)
router.patch(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

// PUT /:id -> تعديل بيانات مستخدم
router.put(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

// DELETE /:id -> حذف مستخدم مع التحقق من المعرف
router.delete('/:id', validate({ params: userIdParamSchema }), usersController.deleteUser);

export { router };
export default router;
