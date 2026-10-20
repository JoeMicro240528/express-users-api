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

/**
 * POST /auth/refresh-token -> تجديد الـ Access Token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: incomingToken } = req.body;
    const result = await authService.refreshAccessToken(incomingToken);

    res.status(200).json({
      success: true,
      message: 'تم تجديد الـ Token بنجاح',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout -> تسجيل الخروج وإبطال الـ Refresh Token
 */
const logout = async (req, res, next) => {
  try {
    const result = await authService.logout(req.user._id);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/forgot-password -> طلب استعادة كلمة المرور
 */
const forgotPassword = async (req, res, next) => {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const result = await authService.forgotPassword(req.body.email, origin);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST أو PATCH /auth/reset-password/:token -> إعادة تعيين كلمة المرور
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const result = await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح وتوليد رموز تسجيل دخول جديدة',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};

export default {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};
