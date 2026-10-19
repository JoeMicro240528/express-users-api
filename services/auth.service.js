import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * إنشاء رمز التحقق (JWT Token)
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_123456789_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * تسجيل حساب مستخدم جديد
 */
const register = async ({ name, email, password, age }) => {
  // 1. التحقق من عدم وجود حساب مسبق بنفس البريد الإلكتروني
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر', 400);
  }

  // 2. إنشاء المستخدم الجديد (سيتم تشفير كلمة المرور تلقائياً عبر pre-save hook في User Model)
  const newUser = await User.create({
    name,
    email,
    password,
    age,
    role: 'user' // تعيين الدور الافتراضي كمستخدم عادي
  });

  // 3. توليد الـ Token
  const token = generateToken(newUser._id, newUser.role);

  // 4. استخراج كائن المستخدم دون إرجاع كلمة المرور
  const userResponse = newUser.toObject();
  delete userResponse.password;

  return {
    user: userResponse,
    token
  };
};

/**
 * تسجيل دخول المستخدم
 */
const login = async ({ email, password }) => {
  // 1. البحث عن المستخدم مع تضمين كلمة المرور المشفرة (+password) لأنها مستبعدة افتراضياً
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  // 2. التحقق من أن الحساب نشط
  if (!user.isActive) {
    throw new AppError('هذا الحساب معطل حالياً، يرجى مراجعة الإدارة', 403);
  }

  // 3. التحقق من مطابقة كلمة المرور المدخلة مع المشفرة
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  // 4. توليد الـ Token
  const token = generateToken(user._id, user.role);

  // 5. استبعاد كلمة المرور من بيانات الاستجابة
  const userResponse = user.toObject();
  delete userResponse.password;

  return {
    user: userResponse,
    token
  };
};

export {
  register,
  login,
  generateToken
};

export default {
  register,
  login,
  generateToken
};
