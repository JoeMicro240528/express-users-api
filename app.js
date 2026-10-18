require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const usersRoutes = require('./routes/users.routes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

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
  res.send('Server is running. Navigate to /users to test user routes.');
});

// ربط الـ Router على المسار الأساسي /users
app.use('/users', usersRoutes);

// معالجة أي مسار غير موجود (404 Not Found)
app.use((req, res, next) => {
  next(new AppError(`المسار ${req.originalUrl} غير موجود على هذا الخادم`, 404));
});

// وسيط معالجة الأخطاء المركزي (يجب أن يكون دائماً في نهاية الـ Middlewares)
app.use(errorHandler);

// بدء تشغيل الخادم
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
