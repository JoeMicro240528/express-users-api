import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
    }
  },
  {
    timestamps: true // يضيف تلقائياً createdAt و updatedAt
  }
);

// تشفير كلمة المرور تلقائياً قبل حفظ المستخدم إذا تم تعديلها أو إنشاؤها
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// دالة لمقارنة كلمة المرور المدخلة مع كلمة المرور المشفرة
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// إنشاء النموذج وتصديره
const User = mongoose.model('User', userSchema);

export { User };
export default User;
