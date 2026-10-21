import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import User from '../models/User.js';

describe('Auth Endpoints Integration Tests', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Auth Test User',
    email: `auth_user_${timestamp}@test-api.com`,
    password: 'Password123!',
    age: 26
  };

  let createdTokens = {
    accessToken: null,
    refreshToken: null
  };

  describe('POST /auth/register', () => {
    it('يجب أن يسجل مستخدماً جديداً بنجاح ويعيد بياناته والرموز (201 Created)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.password).toBeUndefined(); // التأكد من عدم إرجاع كلمة المرور
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      createdTokens.accessToken = res.body.accessToken;
      createdTokens.refreshToken = res.body.refreshToken;
    });

    it('يجب أن يرفض التسجيل ببريد إلكتروني مسجل مسبقاً (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('مسجل بالفعل');
    });

    it('يجب أن يفشل في حال عدم استيفاء شروط التحقق Zod Schema (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'A', // أقصر من 3 أحرف
          email: 'not-an-email',
          password: '123' // أقل من 6 أحرف
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('يجب أن يحتوي المسار على ترويسات Rate Limiting للحماية', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Rate Limit Probe',
          email: 'invalid-probe@test-api.com',
          password: '123'
        });

      // التحقق من وجود ترويسات Rate Limit القياسية
      expect(res.headers).toHaveProperty('ratelimit-limit');
    });
  });

  describe('POST /auth/login', () => {
    it('يجب أن يسجل الدخول بنجاح مع بيانات صحيحة (200 OK)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      // تحديث التوكنات لضمان صلاحيتها للاختبارات التالية
      createdTokens.accessToken = res.body.accessToken;
      createdTokens.refreshToken = res.body.refreshToken;
    });

    it('يجب أن يرفض تسجيل الدخول بكلمة مرور خاطئة (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('غير صحيحة');
    });

    it('يجب أن يرفض تسجيل الدخول لبريد غير موجود (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test-api.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('يجب أن يجدد الـ Tokens بنجاح عند إرسال Refresh Token صالح (200 OK)', async () => {
      const res = await request(app)
        .post('/auth/refresh-token')
        .send({
          refreshToken: createdTokens.refreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      // تدوير التوكن: يجب أن يكون الـ refreshToken الجديد مختلفاً عن القديم
      expect(res.body.refreshToken).not.toBe(createdTokens.refreshToken);

      createdTokens.accessToken = res.body.accessToken;
      createdTokens.refreshToken = res.body.refreshToken;
    });

    it('يجب أن يرفض التجديد عند إرسال رمز غير صالح (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/auth/refresh-token')
        .send({
          refreshToken: 'invalid.jwt.token.string'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Password Reset Flow', () => {
    let devResetToken;

    it('يجب أن يقبل طلب استعادة كلمة المرور لبريد مسجل (200 OK)', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // التأكد من استخراج الرمز في بيئة الاختبار (devResetToken)
      devResetToken = res.body.devResetToken;
    });

    it('يجب أن يرفض إعادة تعيين كلمة المرور برمز غير صالح (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/auth/reset-password/invalid_token_1234567890')
        .send({
          password: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('يجب أن يرفض إعادة التعيين إذا كانت كلمات المرور غير متطابقة (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/auth/reset-password/${devResetToken || 'validtoken123456'}`)
        .send({
          password: 'BrandNewPassword123!',
          confirmPassword: 'DifferentPassword456!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toContain('غير متطابقة');
    });

    it('يجب أن يعيد تعيين كلمة المرور بنجاح بالرمز الصالح وتوليد توكنات جديدة (200 OK)', async () => {
      if (!devResetToken) {
        // توليد رمز يدوي عبر الموديل في حال عدم توفره
        const user = await User.findOne({ email: testUser.email });
        devResetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
      }

      const newPass = 'BrandNewPassword123!';
      const res = await request(app)
        .post(`/auth/reset-password/${devResetToken}`)
        .send({
          password: newPass,
          confirmPassword: newPass
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();

      // تجربة تسجيل الدخول بكلمة المرور الجديدة للتأكد
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPass
        });

      expect(loginRes.status).toBe(200);
      createdTokens.accessToken = loginRes.body.accessToken;
    });
  });

  describe('POST /auth/logout', () => {
    it('يجب أن يرفض تسجيل الخروج دون توفر Bearer Token (401 Unauthorized)', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });

    it('يجب أن يسجل الخروج ويبطل الـ Refresh Token في قاعدة البيانات (200 OK)', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${createdTokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // التأكد من إفراغ refreshToken في قاعدة البيانات
      const dbUser = await User.findOne({ email: testUser.email }).select('+refreshToken');
      expect(dbUser.refreshToken).toBeNull();
    });
  });
});
