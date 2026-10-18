const express = require('express');
const router = express.Router();

const usersController = require('../controllers/users.controller');
const { validate } = require('../middlewares/validate.middleware');
const {
  getUsersQuerySchema,
  createUserSchema,
  userIdParamSchema
} = require('../schemas/users.schema');

// GET / -> جلب المستخدمين مع التحقق من معلمات البحث والتصفية والترقيم (Query Params)
router.get('/', validate({ query: getUsersQuerySchema }), usersController.getAllUsers);

// GET /:id -> جلب مستخدم محدد مع التحقق من المعرف
router.get('/:id', validate({ params: userIdParamSchema }), usersController.getUserById);

// POST / -> إضافة مستخدم جديد مع التحقق من البيانات المدخلة
router.post('/', validate({ body: createUserSchema }), usersController.createUser);

// DELETE /:id -> حذف مستخدم مع التحقق من المعرف
router.delete('/:id', validate({ params: userIdParamSchema }), usersController.deleteUser);

module.exports = router;
