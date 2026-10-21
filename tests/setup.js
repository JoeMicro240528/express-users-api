import 'dotenv/config';
import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';
import connectDB from '../config/database.js';
import User from '../models/User.js';

process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // التأكد من الاتصال بقاعدة البيانات قبل بدء الاختبارات
  await connectDB();
  // تنظيف أي بيانات سابقة من تجارب اختبارية لم تكتمل
  await User.deleteMany({ email: /@test-api\.com$/ });
});

afterAll(async () => {
  // تنظيف كافة المستخدمين المنشئين في دورة الاختبار
  await User.deleteMany({ email: /@test-api\.com$/ });
  // إغلاق اتصال Mongoose حتى تنهي Vitest العمليات وتخرج بأمان
  await mongoose.disconnect();
});
