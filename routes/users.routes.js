import express from 'express';
import usersController from '../controllers/users.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadAvatar } from '../middlewares/upload.middleware.js';
import {
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  userIdParamSchema
} from '../schemas/users.schema.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: مسارات إدارة المستخدمين (تتطلب Bearer Token للمصادقة)
 */

// 🔒 تفعيل وسيط الحماية على جميع مسارات المستخدمين
router.use(protect);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: جلب بيانات الحساب الحالي للمستخدم المسجل دخوله
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: تم جلب بيانات الحساب بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: غير مصرح (Token مفقود أو غير صالح)
 */
router.get('/me', usersController.getMe);

/**
 * @swagger
 * /users/me/avatar:
 *   patch:
 *     summary: رفع وتحديث الصورة الشخصية للمستخدم الحالي (Avatar)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: ملف الصورة بصيغة JPG أو PNG أو WebP (بحد أقصى 3 ميجابايت)
 *     responses:
 *       200:
 *         description: تم رفع وتحديث الصورة الشخصية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: تم تحديث الصورة الشخصية بنجاح }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: نوع الملف غير مدعوم أو تجاوز الحد الأقصى للحجم (3MB)
 *       401:
 *         description: غير مصرح
 *   delete:
 *     summary: حذف الصورة الشخصية الحالية للمستخدم
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: تم حذف الصورة الشخصية بنجاح
 *       401:
 *         description: غير مصرح
 */
router.patch('/me/avatar', uploadAvatar('avatar'), usersController.uploadAvatar);
router.delete('/me/avatar', usersController.deleteAvatar);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: جلب قائمة المستخدمين مع دعم البحث والتصفية والترقيم
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: رقم الصفحة
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: عدد العناصر في كل صفحة
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: بحث في الاسم أو البريد الإلكتروني
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: تصفية حسب الدور
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: تصفية حسب حالة النشاط
 *     responses:
 *       200:
 *         description: تم جلب المستخدمين بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: غير مصرح
 */
router.get('/', validate({ query: getUsersQuerySchema }), usersController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: جلب مستخدم محدد بواسطة المعرف ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: معرف المستخدم (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: تم العثور على المستخدم
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: المستخدم غير موجود
 */
router.get('/:id', validate({ params: userIdParamSchema }), usersController.getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: إنشاء مستخدم جديد (متاح للمشرف admin فقط)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
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
 *               name: { type: string, example: Sara Ali }
 *               email: { type: string, example: sara@example.com }
 *               password: { type: string, example: Password123 }
 *               role: { type: string, enum: [user, admin], default: user }
 *               isActive: { type: boolean, default: true }
 *               age: { type: number, example: 22 }
 *     responses:
 *       201:
 *         description: تم إنشاء المستخدم بنجاح
 *       403:
 *         description: غير مسموح (يتطلب صلاحية admin)
 */
router.post(
  '/',
  restrictTo('admin'),
  validate({ body: createUserSchema }),
  usersController.createUser
);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: تعديل بيانات مستخدم (Partial Update)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: معرف المستخدم
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Updated Name }
 *               email: { type: string, example: newemail@example.com }
 *               age: { type: number, example: 26 }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: تم تحديث البيانات بنجاح
 *       400:
 *         description: خطأ في البيانات المدخلة أو محاولة تعديل role
 *       404:
 *         description: المستخدم غير موجود
 */
router.patch(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: تعديل بيانات مستخدم
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: معرف المستخدم
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Updated Name }
 *               email: { type: string, example: newemail@example.com }
 *               age: { type: number, example: 26 }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: تم تحديث البيانات بنجاح
 */
router.put(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: حذف مستخدم (متاح للمشرف admin فقط)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: معرف المستخدم المراد حذفه
 *     responses:
 *       200:
 *         description: تم حذف المستخدم بنجاح
 *       403:
 *         description: غير مسموح (يتطلب صلاحية admin)
 *       404:
 *         description: المستخدم غير موجود
 */
router.delete(
  '/:id',
  restrictTo('admin'),
  validate({ params: userIdParamSchema }),
  usersController.deleteUser
);

export { router };
export default router;
