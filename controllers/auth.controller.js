import authService from '../services/auth.service.js';

/**
 * POST /auth/register -> تسجيل حساب مستخدم جديد
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الحساب بنجاح',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login -> تسجيل الدخول
 */
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export { register, login };
export default { register, login };
