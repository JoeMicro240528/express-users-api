import logger from '../utils/logger.js';

/**
 * وسيط مركزي لمعالجة جميع الأخطاء في Express وتوثيقها عبر Pino Logger
 */
const errorHandler = (err, req, res, next) => {
  // معالجة أخطاء Multer وتحويلها إلى 400 Bad Request
  if (err.name === 'MulterError') {
    err.statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.message = 'حجم الملف يتجاوز الحد المسموح به (2 ميجابايت)';
    }
  } else if (err.message && err.message.includes('Only JPEG, PNG, and WebP')) {
    err.statusCode = 400;
  }

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // توثيق الخطأ باستخدام Pino Logger
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        statusCode
      },
      `[Server Error] ${err.message}`
    );
  } else {
    logger.warn(
      {
        message: err.message,
        method: req.method,
        url: req.originalUrl,
        statusCode
      },
      `[Client Error] ${err.message}`
    );
  }

  res.status(statusCode).json({
    success: false,
    status,
    message: err.message || 'حدث خطأ في الخادم (Internal Server Error)',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export { errorHandler };
export default errorHandler;
