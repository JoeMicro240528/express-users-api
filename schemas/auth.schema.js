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

export { registerSchema, loginSchema };
export default { registerSchema, loginSchema };
