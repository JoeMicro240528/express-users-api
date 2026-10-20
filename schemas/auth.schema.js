import { z } from 'zod';

// مخطط التحقق لتسجيل مستخدم جديد (Register Schema)
const registerSchema = z.object({
  name: z
    .string({ required_error: 'الاسم مطلوب' })
    .min(3, 'الاسم يجب أن يحتوي على 3 أحرف على الأقل')
    .max(50, 'الاسم يجب ألا يتجاوز 50 حرفاً'),
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب' })
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة' })
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  age: z
    .number({ invalid_type_error: 'العمر يجب أن يكون رقماً' })
    .min(0, 'العمر يجب أن يكون 0 أو أكثر')
    .optional()
});

// مخطط التحقق لتسجيل الدخول (Login Schema)
const loginSchema = z.object({
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب' })
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة' })
    .min(1, 'كلمة المرور مطلوبة')
});

// مخطط التحقق لتجديد الـ Token (Refresh Token Schema)
const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'الـ Refresh Token مطلوب' })
    .min(1, 'الـ Refresh Token لا يمكن أن يكون فارغاً')
});

// مخطط التحقق لطلب استعادة كلمة المرور (Forgot Password Schema)
const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب' })
    .email('صيغة البريد الإلكتروني غير صحيحة')
});

// مخطط التحقق لإعادة تعيين كلمة المرور (Reset Password Schema)
const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'كلمة المرور الجديدة مطلوبة' })
      .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    confirmPassword: z
      .string({ required_error: 'تأكيد كلمة المرور مطلوب' })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword']
  });

// مخطط التحقق من رمز إعادة التعيين في معلمات الرابط
const resetPasswordParamSchema = z.object({
  token: z
    .string({ required_error: 'رمز إعادة التعيين مطلوب' })
    .min(10, 'رمز إعادة التعيين غير صالح')
});

export {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordParamSchema
};
export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordParamSchema
};
