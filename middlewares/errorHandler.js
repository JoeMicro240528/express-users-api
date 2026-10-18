/**
 * وسيط مركزي لمعالجة جميع الأخطاء في Express
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    success: false,
    status,
    message: err.message || 'حدث خطأ في الخادم (Internal Server Error)',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export { errorHandler };
export default errorHandler;
