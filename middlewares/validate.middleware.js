const { ZodError } = require('zod');

/**
 * وسيط (Middleware) عام للتحقق من صحة البيانات باستخدام Zod
 * @param {Object} schemas - كائن يحتوي على مخططات التحقق للـ (body, params, query)
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        const parsedParams = schemas.params.parse(req.params);
        Object.defineProperty(req, 'params', {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError || error.issues || error.errors) {
        const issues = error.issues || error.errors || [];
        return res.status(400).json({
          success: false,
          message: 'خطأ في التحقق من صحة البيانات (Validation Error)',
          errors: issues.map((err) => ({
            field: Array.isArray(err.path) ? err.path.join('.') : '',
            message: err.message
          }))
        });
      }
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ غير متوقع أثناء التحقق'
      });
    }
  };
};

module.exports = { validate };
