import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * مخطط المستخدم (User Schema)
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
      minlength: [3, 'الاسم يجب أن يحتوي على 3 أحرف على الأقل'],
      maxlength: [50, 'الاسم يجب ألا يتجاوز 50 حرفاً']
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'صيغة البريد الإلكتروني غير صحيحة'
      ]
    },
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
      select: false // إخفاء كلمة المرور تلقائياً من نتائج الاستعلامات
    },
    passwordChangedAt: {
      type: Date
    },
    passwordResetToken: {
      type: String,
      select: false // إخفاء رمز استعادة كلمة المرور المشفر
    },
    passwordResetExpires: {
      type: Date,
      select: false // إخفاء وقت انتهاء صلاحية الرمز
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'الدور يجب أن يكون إما user أو admin'
      },
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    age: {
      type: Number,
      min: [0, 'العمر يجب أن يكون رقماً موجباً']
    },
    avatar: {
      type: String,
      default: null
    },
    refreshToken: {
      type: String,
      select: false // إخفاء الـ refresh token تلقائياً من الاستعلامات
    }
  },
  {
    timestamps: true // يضيف تلقائياً createdAt و updatedAt
  }
);

// تشفير كلمة المرور تلقائياً وتحديث passwordChangedAt قبل الحفظ
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // تحديث وقت تغيير كلمة المرور للمستخدمين القدامى فقط (وليس عند التسجيل لأول مرة)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
});

// دالة لمقارنة كلمة المرور المدخلة مع كلمة المرور المشفرة
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// دالة للتحقق مما إذا تم تغيير كلمة المرور بعد تاريخ إصدار الـ JWT Token
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// دالة لتوليد رمز استعادة كلمة المرور المشفر مع تعيين مدة صلاحيته (10 دقائق)
userSchema.methods.createPasswordResetToken = function () {
  // توليد رمز عشوائي غير مشفر لإرساله للمستخدم عبر البريد
  const resetToken = crypto.randomBytes(32).toString('hex');

  // تشفير الرمز باستخدام SHA-256 لحفظه بأمان في قاعدة البيانات
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // تعيين مدة الصلاحية: 10 دقائق من اللحظة الحالية
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// ==========================================
// فهارس تحسين الأداء (Performance Indexes)
// ==========================================

// 1. فهرس الترتيب الزمني الأحدث أولاً (Pagination & Sorting)
userSchema.index({ createdAt: -1 });

// 2. فهارس مركبة للتصفية مع الترتيب وفق قاعدة ESR (Equality, Sort, Range)
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ isActive: 1, createdAt: -1 });
userSchema.index({ role: 1, isActive: 1, createdAt: -1 });

// 3. فهرس جزئي (Sparse Index) للبحث الفوري في رمز استعادة كلمة المرور دون حجز ذاكرة للقيم الفارغة
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

// إنشاء النموذج وتصديره
const User = mongoose.model('User', userSchema);

export { User };
export default User;
