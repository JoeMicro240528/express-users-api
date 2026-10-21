import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // تشغيل ملفات الاختبار بتسلسل لتجنب تضارب التعديل على قاعدة البيانات ومحددات الطلبات
    fileParallelism: false
  }
});
