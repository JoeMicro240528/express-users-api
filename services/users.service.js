import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * جلب المستخدمين مباشرة من قاعدة بيانات MongoDB مع دعم:
 * - Search: البحث في الاسم والبريد الإلكتروني (Case-insensitive)
 * - Filtering: التصفية بحسب الدور (role) وحالة النشاط (isActive)
 * - Pagination: تقسيم الصفحات عبر page و limit
 */
const getAllUsers = async ({ page = 1, limit = 10, search, role, isActive } = {}) => {
  const filter = {};

  // 1. Search (البحث في الاسم أو البريد)
  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex }
    ];
  }

  // 2. Filtering (التصفية)
  if (role) {
    filter.role = role;
  }

  if (isActive !== undefined) {
    filter.isActive = typeof isActive === 'boolean' ? isActive : isActive === 'true';
  }

  // 3. Pagination (الترقيم)
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 10;
  const skip = (pageNum - 1) * limitNum;

  // جلب البيانات من MongoDB والعدد الإجمالي بالتوازي
  const [users, totalItems] = await Promise.all([
    User.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    data: users,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * البحث عن مستخدم بواسطة المعرف ID من قاعدة البيانات
 */
const findUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`معرف المستخدم ${id} غير صالح (Invalid ObjectId)`, 400);
  }

  const user = await User.findById(id).lean();

  if (!user) {
    throw new AppError(`المستخدم بالمعرف ${id} غير موجود في قاعدة البيانات`, 404);
  }

  return user;
};

/**
 * إضافة مستخدم جديد في قاعدة بيانات MongoDB
 */
const createUser = async ({ name, email, password, role = 'user', isActive = true, age }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر', 400);
  }

  const newUser = await User.create({
    name,
    email,
    password,
    role,
    isActive,
    age
  });

  const userObj = newUser.toObject();
  delete userObj.password;

  return userObj;
};

/**
 * تحديث بيانات مستخدم بواسطة المعرف ID في قاعدة البيانات
 */
const updateUser = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`معرف المستخدم ${id} غير صالح (Invalid ObjectId)`, 400);
  }

  // الحقول المسموح بتعديلها فقط (منع تعديل role منعاً باتاً)
  const allowedFields = ["name", "email", "age", "isActive"];
  const safeUpdateData = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      safeUpdateData[field] = updateData[field];
    }
  }

  if (Object.keys(safeUpdateData).length === 0) {
    throw new AppError('لا توجد حقول مسموح بتعديلها في هذا الطلب (لا يمكن تعديل الدور role)', 400);
  }

  // إذا تم إرسال بريد جديد، نتأكد أنه غير مسجل لمستخدم آخر
  if (safeUpdateData.email) {
    const emailExists = await User.findOne({
      email: safeUpdateData.email,
      _id: { $ne: id }
    });
    if (emailExists) {
      throw new AppError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر', 400);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    safeUpdateData,
    { returnDocument: 'after', runValidators: true }
  ).lean();

  if (!updatedUser) {
    throw new AppError(`المستخدم بالمعرف ${id} غير موجود في قاعدة البيانات`, 404);
  }

  return updatedUser;
};

/**
 * حذف مستخدم بواسطة المعرف ID من قاعدة البيانات
 */
const deleteUser = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`معرف المستخدم ${id} غير صالح (Invalid ObjectId)`, 400);
  }

  const user = await User.findByIdAndDelete(id).lean();

  if (!user) {
    throw new AppError(`المستخدم بالمعرف ${id} غير موجود في قاعدة البيانات`, 404);
  }

  return user;
};

// دالة مساعدة لحذف ملف الصورة القديم من القرص لتجنب تراكم الملفات غير المستخدمة
const removeAvatarFile = async (avatarPath) => {
  if (!avatarPath || !avatarPath.startsWith('/uploads/avatars/')) return;
  try {
    const filename = path.basename(avatarPath);
    const fullPath = path.join(process.cwd(), 'uploads', 'avatars', filename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (error) {
    // تجاهل الخطأ في حال تعذر مسح الملف القديم
  }
};

/**
 * تحديث الصورة الرمزية للمستخدم (Avatar)
 */
const updateUserAvatar = async (userId, filename) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  // حذف الصورة السابقة إن وجدت
  if (user.avatar) {
    await removeAvatarFile(user.avatar);
  }

  user.avatar = `/uploads/avatars/${filename}`;
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return userObj;
};

/**
 * حذف الصورة الرمزية للمستخدم وإعادتها للقيمة الافتراضية
 */
const deleteUserAvatar = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (user.avatar) {
    await removeAvatarFile(user.avatar);
    user.avatar = null;
    await user.save({ validateBeforeSave: false });
  }

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return userObj;
};

export {
  getAllUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserAvatar,
  deleteUserAvatar
};

export default {
  getAllUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserAvatar,
  deleteUserAvatar
};
