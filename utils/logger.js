import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * إعداد وحدة التسجيل المركزية (Pino Logger)
 * - في بيئة التطوير (Development): يتم تلوين وتنسيق المخرجات عبر pino-pretty لتسهيل القراءة.
 * - في بيئة الإنتاج (Production): يتم إخراج سجلات بصيغة Structured JSON عالية الأداء.
 * - في بيئة الاختبار (Test): يتم كتم السجلات لتجنب تشويش مخرجات الاختبارات.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  // حجب البيانات الحساسة تلقائياً من الظهور في السجلات (Security Redaction)
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.confirmPassword',
      'body.refreshToken',
      'password',
      'refreshToken'
    ],
    censor: '[REDACTED]'
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});

export { logger };
export default logger;
