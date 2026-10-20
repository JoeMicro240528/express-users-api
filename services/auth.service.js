import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { sendEmail } from '../utils/email.js';

/**
 * إنشاء Access Token قصير الأجل (15 دقيقة)
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.ACCESS_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      'super_secret_jwt_key_123456789_change_in_production',
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' }
  );
};

/**
 * إنشاء Refresh Token طويل الأجل (7 أيام)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET ||
      'super_secret_refresh_token_key_987654321_change_in_production',
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

/**
 * دالة مساعدة لتوليد كلا الرمزين وحفظ Refresh Token في قاعدة البيانات
 */
const generateAuthTokens = async (user) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // حفظ الـ Refresh Token في قاعدة البيانات لإمكانية إبطاله لاحقاً (Logout)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken,
    refreshToken,
    token: accessToken // للتوافق العكسي مع الأنظمة التي تستخدم خاصية token
  };
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

  // 2. إنشاء المستخدم الجديد
  const newUser = new User({
    name,
    email,
    password,
    age,
    role: 'user'
  });

  // 3. توليد الرموز وحفظ المستخدم
  const tokens = await generateAuthTokens(newUser);

  // 4. استخراج كائن المستخدم دون إرجاع كلمة المرور أو الـ refreshToken
  const userResponse = newUser.toObject();
  delete userResponse.password;
  delete userResponse.refreshToken;

  return {
    user: userResponse,
    ...tokens
  };
};

/**
 * تسجيل دخول المستخدم
 */
const login = async ({ email, password }) => {
  // 1. البحث عن المستخدم مع تضمين كلمة المرور المشفرة للتحقق
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  // 2. التحقق من أن الحساب نشط
  if (!user.isActive) {
    throw new AppError('هذا الحساب معطل حالياً، يرجى مراجعة الإدارة', 403);
  }

  // 3. التحقق من مطابقة كلمة المرور المدخلة
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  // 4. توليد Access Token و Refresh Token وحفظ الأخير في DB
  const tokens = await generateAuthTokens(user);

  // 5. استبعاد كلمة المرور والـ refreshToken من الرد
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshToken;

  return {
    user: userResponse,
    ...tokens
  };
};

/**
 * تجديد الـ Access Token باستخدام Refresh Token صالح
 */
const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError('الـ Refresh Token مفقود', 401);
  }

  // 1. التحقق من صحة وصلاحية الـ Refresh Token
  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET ||
        'super_secret_refresh_token_key_987654321_change_in_production'
    );
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('انتهت صلاحية الـ Refresh Token، يرجى تسجيل الدخول مجدداً', 403);
    }
    throw new AppError('الـ Refresh Token غير صالح', 403);
  }

  // 2. التحقق من وجود المستخدم ومطابقة الـ refreshToken المخزن في قاعدة البيانات
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user) {
    throw new AppError('المستخدم صاحب هذا الرمز لم يعد موجوداً', 404);
  }

  if (!user.isActive) {
    throw new AppError('تم تعطيل هذا الحساب، يرجى التواصل مع الإدارة', 403);
  }

  if (!user.refreshToken || user.refreshToken !== incomingRefreshToken) {
    throw new AppError('الـ Refresh Token غير صالح أو تم إبطاله (Reuse/Revoked)', 403);
  }

  // 3. تدوير الرموز (Token Rotation) لإصدار Access Token و Refresh Token جديدين
  const newTokens = await generateAuthTokens(user);

  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    token: newTokens.accessToken
  };
};

/**
 * تسجيل الخروج وإبطال الـ Refresh Token
 */
const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
  return { message: 'تم تسجيل الخروج وإبطال الـ Refresh Token بنجاح' };
};

/**
 * طلب استعادة كلمة المرور (Forgot Password)
 * يرسل رمزاً مؤقتاً عبر البريد الإلكتروني للمستخدم
 */
const forgotPassword = async (email, reqOrigin) => {
  // 1. البحث عن المستخدم بالبريد الإلكتروني
  const user = await User.findOne({ email });

  // لحماية خصوصية المستخدمين ومنع تخمين الإيميلات (Email Enumeration Attack)
  // نعيد نفس الرسالة دائماً حتى وإن لم يكن الحساب موجوداً
  if (!user) {
    return {
      message: 'إذا كان البريد الإلكتروني مسجلاً، فسيتم إرسال رابط إعادة تعيين كلمة المرور'
    };
  }

  // 2. توليد رمز إعادة التعيين العشوائي وتشفيره داخل الموديل مع تحديد الصلاحية (10 دقائق)
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. بناء رابط استعادة كلمة المرور
  const baseUrl = process.env.CLIENT_URL || reqOrigin || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/auth/reset-password/${resetToken}`;

  // 4. إعداد محتوى الرسالة
  const subject = 'طلب إعادة تعيين كلمة المرور - Express Users API';
  const text = `مرحباً ${user.name}،\n\nلقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.\nيرجى استخدام الرابط التالي لإعادة التعيين (صالح لمدة 10 دقائق فقط):\n${resetUrl}\n\nإذا لم تطلب ذلك بنفسك، يرجى تجاهل هذه الرسالة.`;
  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #2b6cb0; margin-bottom: 20px;">طلب إعادة تعيين كلمة المرور</h2>
      <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">مرحباً <strong>${user.name}</strong>،</p>
      <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك المسجل في نظامنا.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #3182ce; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">إعادة تعيين كلمة المرور</a>
      </div>
      <p style="color: #718096; font-size: 14px;">أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>
      <p style="word-break: break-all; color: #3182ce; font-size: 13px; background-color: #edf2f7; padding: 10px; border-radius: 5px;">${resetUrl}</p>
      <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0;">
      <p style="color: #a0aec0; font-size: 12px;">ملاحظة: هذا الرابط صالح لمدة <strong>10 دقائق</strong> فقط. إذا لم تكن أنت من قام بهذا الطلب، يمكنك تجاهل هذا البريد بأمان.</p>
    </div>
  `;

  // 5. محاولة إرسال البريد الإلكتروني
  try {
    await sendEmail({
      to: user.email,
      subject,
      text,
      html,
      resetUrl
    });

    const response = {
      message: 'إذا كان البريد الإلكتروني مسجلاً، فسيتم إرسال رابط إعادة تعيين كلمة المرور'
    };

    // في بيئة التطوير نقوم بإرجاع التوكن لتسهيل الاختبار عبر Swagger / Postman
    if (process.env.NODE_ENV !== 'production') {
      response.devResetToken = resetToken;
      response.devResetUrl = resetUrl;
    }

    return response;
  } catch (error) {
    // في حال فشل الإرسال، نقوم بإلغاء التوكن حتى لا يبقى معلقاً
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    throw new AppError('حدث خطأ أثناء محاولة إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً', 500);
  }
};

/**
 * تعيين كلمة مرور جديدة باستخدام الرمز (Reset Password)
 */
const resetPassword = async (token, newPassword) => {
  // 1. تشفير الرمز الوارد باستخدام SHA-256 للبحث عنه في قاعدة البيانات
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // 2. البحث عن المستخدم ومطابقة الرمز والتحقق من عدم انتهاء الصلاحية
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('رمز إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته (المدة 10 دقائق)', 400);
  }

  // 3. تحديث كلمة المرور وإلغاء حقول الرمز
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // 4. توليد رموز مصادقة جديدة (Access Token & Refresh Token)
  const tokens = await generateAuthTokens(user);

  // 5. حفظ التعديلات (سيقوم هوك pre-save بتشفير كلمة المرور وتحديث passwordChangedAt)
  await user.save();

  // 6. تجهيز كائن الاستجابة
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshToken;
  delete userResponse.passwordResetToken;
  delete userResponse.passwordResetExpires;

  return {
    user: userResponse,
    ...tokens
  };
};

export {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  generateAccessToken,
  generateRefreshToken
};

export default {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  generateAccessToken,
  generateRefreshToken
};
