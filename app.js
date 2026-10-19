import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import errorHandler from './middlewares/errorHandler.js';
import AppError from './utils/AppError.js';

// الاتصال بقاعدة البيانات MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. تعيين ترويسات الأمان HTTP عبر Helmet
app.use(helmet());

// 2. تفعيل مشاركة الموارد عبر الأصول المختلفة (CORS)
app.use(cors());

// 3. تحديد معدل الطلبات للحد من الطلبات الزائدة (Rate Limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // نافذة زمنية: 15 دقيقة
  max: 100, // الحد الأقصى: 100 طلب لكل IP خلال النافذة الزمنية
  standardHeaders: true, // تفعيل الترويسات القياسية RateLimit-*
  legacyHeaders: false, // إلغاء الترويسات القديمة X-RateLimit-*
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى للطلبات من هذا الـ IP، يرجى المحاولة بعد 15 دقيقة'
  }
});
app.use(limiter);

// 4. معالجة بيانات الـ JSON القادمة في جسم الطلب (Request Body)
app.use(express.json({ limit: '10kb' }));

// مسار اختباري للصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('Server is running with ES Modules. Navigate to /users to test user routes.');
});

// ربط مسارات المصادقة والمستخدمين
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);

// معالجة أي مسار غير موجود (404 Not Found)
app.use((req, res, next) => {
  next(new AppError(`المسار ${req.originalUrl} غير موجود على هذا الخادم`, 404));
});

// وسيط معالجة الأخطاء المركزي (يجب أن يكون دائماً في نهاية الـ Middlewares)
app.use(errorHandler);

// بدء تشغيل الخادم إذا تم تشغيل الملف مباشرة
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export { app };
export default app;
