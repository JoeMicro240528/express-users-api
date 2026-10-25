import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AppError from '../utils/AppError.js';

const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

// التأكد من وجود مجلد رفع الصور الرمزية
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. إعداد مسار التخزين واسم الملف
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const userId = req.user ? req.user._id : 'user';
    cb(null, `avatar-${userId}-${Date.now()}${ext}`);
  }
});

// 2. التحقق من نوع وصيغة الملف المرفوع (صور JPG, PNG, WebP فقط)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'نوع الملف غير مدعوم، يرجى رفع صورة بصيغة JPG أو PNG أو WebP',
        400
      ),
      false
    );
  }
};

// 3. تهيئة Multer مع تحديد سقف الحجم
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // الحد الأقصى: 3 ميجابايت
  }
});

/**
 * وسيط رفع الصورة الرمزية للمستخدم مع معالجة أخطاء Multer القياسية
 */
const uploadAvatar = (fieldName = 'avatar') => {
  const single = upload.single(fieldName);

  return (req, res, next) => {
    single(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError('حجم الصورة كبير جداً، الحد الأقصى المسموح به هو 3 ميجابايت', 400)
          );
        }
        return next(new AppError(`خطأ أثناء رفع الملف: ${err.message}`, 400));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

export { uploadAvatar };
export default uploadAvatar;
