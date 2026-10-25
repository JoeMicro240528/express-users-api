import usersService from '../services/users.service.js';
import AppError from '../utils/AppError.js';

// GET / -> جلب المستخدمين من قاعدة البيانات مع البحث والتصفية والترقيم
const getAllUsers = async (req, res, next) => {
  try {
    const result = await usersService.getAllUsers(req.query);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// GET /:id -> جلب مستخدم حسب المعرف من قاعدة البيانات
const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.findUserById(req.params.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// POST / -> إضافة مستخدم جديد في قاعدة البيانات
const createUser = async (req, res, next) => {
  try {
    const newUser = await usersService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة المستخدم بنجاح في قاعدة البيانات',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /:id -> تحديث بيانات مستخدم في قاعدة البيانات
const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await usersService.updateUser(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات المستخدم بنجاح',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /:id -> حذف مستخدم حسب المعرف من قاعدة البيانات
const deleteUser = async (req, res, next) => {
  try {
    const deletedUser = await usersService.deleteUser(req.params.id);
    res.status(200).json({
      success: true,
      message: `تم حذف المستخدم بالمعرف ${req.params.id} بنجاح من قاعدة البيانات`,
      data: deletedUser
    });
  } catch (error) {
    next(error);
  }
};

// GET /me -> جلب بيانات الحساب الحالي للمستخدم المصادق عليه
const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
};

// PATCH /me/avatar -> رفع وتحديث الصورة الشخصية
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('يرجى اختيار صورة للرفع في حقل avatar', 400);
    }

    const updatedUser = await usersService.updateUserAvatar(req.user._id, req.file);

    res.status(200).json({
      success: true,
      message: 'تم تحديث الصورة الشخصية بنجاح',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /me/avatar -> حذف الصورة الشخصية
const deleteAvatar = async (req, res, next) => {
  try {
    const updatedUser = await usersService.deleteUserAvatar(req.user._id);

    res.status(200).json({
      success: true,
      message: 'تم حذف الصورة الشخصية بنجاح',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export {
  getMe,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  deleteAvatar
};

export default {
  getMe,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  deleteAvatar
};
