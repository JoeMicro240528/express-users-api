import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import User from '../models/User.js';
import authService from '../services/auth.service.js';

describe('Users Endpoints Integration Tests', () => {
  const timestamp = Date.now();
  let regularUser;
  let regularToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // 1. إنشاء مستخدم عادي (Role: user)
    const regResult = await authService.register({
      name: 'Regular Test User',
      email: `regular_${timestamp}@test-api.com`,
      password: 'RegularPassword123!',
      age: 24
    });
    regularUser = regResult.user;
    regularToken = regResult.accessToken;

    // 2. إنشاء مستخدم مسؤول (Role: admin) مباشرة في قاعدة البيانات
    const admin = new User({
      name: 'Admin Test User',
      email: `admin_${timestamp}@test-api.com`,
      password: 'AdminPassword123!',
      role: 'admin',
      age: 35
    });
    await admin.save();
    adminUser = admin.toObject();

    // تسجيل دخول الأدمن لتوليد التوكن
    const adminLogin = await authService.login({
      email: admin.email,
      password: 'AdminPassword123!'
    });
    adminToken = adminLogin.accessToken;
  });

  describe('Route Protection & Authentication Middleware', () => {
    it('يجب أن يرفض الوصول إلى /users دون توكن مصادقة (401 Unauthorized)', async () => {
      const res = await request(app).get('/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('يرجى تسجيل الدخول');
    });

    it('يجب أن يرفض التوكن المزيف أو غير الصالح (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer invalid.fake.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /users/me', () => {
    it('يجب أن يعيد الملف الشخصي للمستخدم صاحب الـ Token (200 OK)', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(regularUser._id.toString());
      expect(res.body.data.email).toBe(regularUser.email);
    });
  });

  describe('Avatar Upload & Management (/users/me/avatar)', () => {
    // صورة PNG تجريبية مصغرة بحجم بكسل واحد بصيغة Base64
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    it('يجب أن يرفض رفع الصورة بدون توكن مصادقة (401 Unauthorized)', async () => {
      const res = await request(app)
        .patch('/users/me/avatar')
        .attach('avatar', pngBuffer, 'avatar.png');

      expect(res.status).toBe(401);
    });

    it('يجب أن يرفض الطلب عند عدم إرفاق أي ملف (400 Bad Request)', async () => {
      const res = await request(app)
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('يرجى اختيار صورة');
    });

    it('يجب أن يرفض رفع ملفات غير مدعومة كالملفات النصية (400 Bad Request)', async () => {
      const res = await request(app)
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${regularToken}`)
        .attach('avatar', Buffer.from('fake text content'), 'document.txt');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('نوع الملف غير مدعوم');
    });

    it('يجب أن يرفع الصورة بنجاح ويحدث مسار avatar للمستخدم (200 OK)', async () => {
      const res = await request(app)
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${regularToken}`)
        .attach('avatar', pngBuffer, 'profile.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar).toBeDefined();
      expect(res.body.data.avatar).toContain('/uploads/avatars/avatar-');
    });

    it('يجب أن يحذف الصورة الشخصية ويعيد الحقل إلى null (200 OK)', async () => {
      const res = await request(app)
        .delete('/users/me/avatar')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar).toBeNull();
    });
  });

  describe('GET /users (Pagination, Filtering, Search)', () => {
    it('يجب أن يجلب قائمة المستخدمين مع بيانات الترقيم (200 OK)', async () => {
      const res = await request(app)
        .get('/users?page=1&limit=5')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
    });

    it('يجب أن يصفي المستخدمين بحسب الدور role=admin (200 OK)', async () => {
      const res = await request(app)
        .get('/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.role === 'admin')).toBe(true);
    });

    it('يجب أن يدعم البحث search بالاسم أو البريد (200 OK)', async () => {
      const res = await request(app)
        .get(`/users?search=${regularUser.name}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((u) => u.name === regularUser.name)).toBe(true);
    });
  });

  describe('PATCH /users/:id & Security Guard (Whitelisting)', () => {
    it('يجب أن يسمح للمستخدم بتحديث الحقول المصرح بها كالاسم والعمر (200 OK)', async () => {
      const res = await request(app)
        .patch(`/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Updated Regular Name',
          age: 27
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Regular Name');
      expect(res.body.data.age).toBe(27);
    });

    it('حماية أمنية: يجب تجاهل محاولة ترقية الدور role إلى admin (Privilege Escalation Prevention)', async () => {
      const res = await request(app)
        .patch(`/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Regular With Injected Role',
          role: 'admin' // محاولة غير مصرح بها لترقية الصلاحيات
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Regular With Injected Role');
      // التأكد من أن الدور لم يتغير وظل user رغم محاولة حقنه
      expect(res.body.data.role).toBe('user');

      // التأكد من قاعدة البيانات مباشرة
      const dbUser = await User.findById(regularUser._id);
      expect(dbUser.role).toBe('user');
    });

    it('يجب أن يرفض الطلب إذا تم إرسال حقول غير مصرح بها فقط مثل role وحده (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          role: 'admin'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Authorization (Role-Based Access Control)', () => {
    let createdUserIdByAdmin;

    it('يجب أن يمنع المستخدم العادي من إنشاء مستخدم جديد عبر POST /users (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Forbidden User',
          email: `forbidden_${timestamp}@test-api.com`,
          password: 'Password123!',
          role: 'user'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('ليس لديك الصلاحية');
    });

    it('يجب أن يسمح للأدمن بإنشاء مستخدم جديد عبر POST /users (201 Created)', async () => {
      const res = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Created By Admin',
          email: `created_by_admin_${timestamp}@test-api.com`,
          password: 'Password123!',
          role: 'user',
          age: 29
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Created By Admin');
      createdUserIdByAdmin = res.body.data._id;
    });

    it('يجب أن يمنع المستخدم العادي من حذف مستخدم (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/users/${createdUserIdByAdmin}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('يجب أن يسمح للمسؤول Admin بحذف مستخدم (200 OK)', async () => {
      const res = await request(app)
        .delete(`/users/${createdUserIdByAdmin}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('حذف');

      // التأكد من عدم وجوده في قاعدة البيانات
      const deletedUser = await User.findById(createdUserIdByAdmin);
      expect(deletedUser).toBeNull();
    });
  });
});
