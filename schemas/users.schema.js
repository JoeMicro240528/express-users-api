const { z } = require('zod');

// مخطط التحقق من معلمات الاستعلام (Query Parameters) للـ Search و Filtering و Pagination
const getUsersQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'رقم الصفحة يجب أن يكون رقماً' })
    .int('رقم الصفحة يجب أن يكون رقماً صحيحاً')
    .positive('رقم الصفحة يجب أن يكون أكبر من 0')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'عدد العناصر يجب أن يكون رقماً' })
    .int('عدد العناصر يجب أن يكون رقماً صحيحاً')
    .positive('عدد العناصر يجب أن يكون أكبر من 0')
    .max(100, 'الحد الأقصى لعدد العناصر في الصفحة هو 100')
    .default(10),
  search: z.string().trim().optional(),
  role: z.enum(['admin', 'user'], {
    errorMap: () => ({ message: 'الدور يجب أن يكون admin أو user' })
  }).optional(),
  isActive: z
    .enum(['true', 'false'], {
      errorMap: () => ({ message: 'حالة النشاط يجب أن تكون true أو false' })
    })
    .transform((val) => val === 'true')
    .optional()
});

// مخطط التحقق لإضافة مستخدم جديد (Request Body)
const createUserSchema = z.object({
  name: z
    .string({ required_error: 'الاسم مطلوب' })
    .min(3, 'الاسم يجب أن يحتوي على 3 أحرف على الأقل')
    .max(50, 'الاسم يجب ألا يتجاوز 50 حرفاً'),
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب' })
    .email('صيغة البريد الإلكتروني غير صحيحة'),
  role: z.enum(['admin', 'user']).default('user'),
  isActive: z.boolean().default(true)
});

// مخطط التحقق لمعرف المستخدم في الرابط (Request Params) ليتوافق مع MongoDB ObjectId
const userIdParamSchema = z.object({
  id: z
    .string({ required_error: 'معرف المستخدم مطلوب' })
    .regex(/^[0-9a-fA-F]{24}$/, 'معرف المستخدم غير صالح (يجب أن يكون 24 خانة بنظام ObjectId)')
});

module.exports = {
  getUsersQuerySchema,
  createUserSchema,
  userIdParamSchema
};
