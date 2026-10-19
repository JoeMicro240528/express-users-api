import mongoose from 'mongoose';

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

// إنشاء النموذج وتصديره
const User = mongoose.model('User', userSchema);

export { User };
export default User;
