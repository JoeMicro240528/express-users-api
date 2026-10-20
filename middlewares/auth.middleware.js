import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * وسيط التحقق من صحة JWT Token وحماية المسارات (Authentication)
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. استخراج الـ Token من ترويسة Authorization بصيغة Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('يرجى تسجيل الدخول للوصول إلى هذا المسار (الـ Token مفقود)', 401)
      );
    }

    // 2. فك تشفير والتحقق من صحة وصلاحية الـ Token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET ||
          process.env.JWT_SECRET ||
          'super_secret_jwt_key_123456789_change_in_production'
      );
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(
          new AppError('انتهت صلاحية الـ Token، يرجى تسجيل الدخول مجدداً', 401)
        );
      }
      return next(
        new AppError('الـ Token غير صالح، يرجى تسجيل الدخول مجدداً', 401)
      );
    }

    // 3. التأكد من أن المستخدم صاحب الـ Token ما زال موجوداً في قاعدة البيانات
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('المستخدم صاحب هذا الـ Token لم يعد موجوداً في النظام', 401)
      );
    }

    // 4. التأكد من أن حساب المستخدم نشط
    if (!currentUser.isActive) {
      return next(
        new AppError('هذا الحساب معطل حالياً، يرجى مراجعة الإدارة', 403)
      );
    }

    // 5. التحقق مما إذا تم تغيير كلمة المرور بعد تاريخ إصدار هذا الرمز (JWT)
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('تم تغيير كلمة المرور مؤخراً، يرجى تسجيل الدخول مجدداً باستخدام كلمة المرور الجديدة', 401)
      );
    }

    // 6. إرفاق بيانات المستخدم في كائن الطلب req.user لاستخدامه في المسارات اللاحقة
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * وسيط لتقييد الوصول بناءً على أدوار المستخدمين (Authorization)
 * مثال: restrictTo('admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('ليس لديك الصلاحية الكافية للقيام بهذا الإجراء', 403)
      );
    }
    next();
  };
};

export {
  protect,
  restrictTo
};

export default {
  protect,
  restrictTo
};
