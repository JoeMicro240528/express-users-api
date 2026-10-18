import express from 'express';
import usersController from '../controllers/users.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getUsersQuerySchema,
  createUserSchema,
  userIdParamSchema
} from '../schemas/users.schema.js';

const router = express.Router();

// GET / -> جلب المستخدمين مع التحقق من معلمات البحث والتصفية والترقيم (Query Params)
router.get('/', validate({ query: getUsersQuerySchema }), usersController.getAllUsers);

// GET /:id -> جلب مستخدم محدد مع التحقق من المعرف
router.get('/:id', validate({ params: userIdParamSchema }), usersController.getUserById);

// POST / -> إضافة مستخدم جديد مع التحقق من البيانات المدخلة
router.post('/', validate({ body: createUserSchema }), usersController.createUser);

// DELETE /:id -> حذف مستخدم مع التحقق من المعرف
router.delete('/:id', validate({ params: userIdParamSchema }), usersController.deleteUser);

export { router };
export default router;
