import logger from '../utils/logger.js';

/**
 * وسيط مركزي لمعالجة جميع الأخطاء في Express وتوثيقها عبر Pino Logger
 */
const errorHandler = (err, req, res, next) => {
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
