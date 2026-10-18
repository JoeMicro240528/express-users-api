const mongoose = require('mongoose');
const User = require('../models/User');
const AppError = require('../utils/AppError');

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
const createUser = async ({ name, email, role = 'user', isActive = true }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر', 400);
  }

  const newUser = await User.create({
    name,
    email,
    role,
    isActive
  });

  return newUser;
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

module.exports = {
  getAllUsers,
  findUserById,
  createUser,
  deleteUser
};
