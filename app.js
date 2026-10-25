import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import pinoHttp from 'pino-http';

import logger from './utils/logger.js';
import swaggerSpec from './config/swagger.js';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import errorHandler from './middlewares/errorHandler.js';
import AppError from './utils/AppError.js';

// الاتصال بقاعدة البيانات MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. تعيين ترويسات الأمان HTTP عبر Helmet (مع السماح لـ Swagger UI بالعمل)
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// 2. تفعيل مشاركة الموارد عبر الأصول المختلفة (CORS)
app.use(cors());

// 3. تسجيل بيانات الطلبات HTTP تلقائياً عبر Pino-HTTP
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        process.env.NODE_ENV === 'test' || req.url.startsWith('/api-docs')
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    }
  })
);

// 4. توثيق Swagger UI و OpenAPI JSON (متاح دون Rate Limit)
// استخدام روابط CDN لملفات Swagger UI لضمان عملها بشكل مثالي على Vercel و Serverless
const SWAGGER_CSS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui.min.css';
const SWAGGER_JS_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2/swagger-ui-standalone-preset.min.js'
];

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCssUrl: SWAGGER_CSS_URL,
    customJs: SWAGGER_JS_URLS,
    customSiteTitle: 'Express Users API Docs'
  })
);
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 4. تحديد معدل الطلبات للحد من الطلبات الزائدة (Rate Limiting)
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

// 5. معالجة بيانات الـ JSON القادمة في جسم الطلب (Request Body)
app.use(express.json({ limit: '10kb' }));

// 6. تقديم ملفات المرفوعات الثابتة كصور المستخدمين (Static Files)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// مسار اختباري للصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('Server is running. Navigate to /api-docs for API Documentation.');
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
    logger.info(`Server is running on http://localhost:${PORT}`);
    logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
}

export { app };
export default app;
