import swaggerJSDoc from 'swagger-jsdoc';

/**
 * إعدادات توثيق Swagger / OpenAPI 3.0
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Users & Authentication API',
      version: '1.0.0',
      description:
        'توثيق تفاعلي لواجهة برمجة التطبيقات (API) لإدارة المستخدمين والمصادقة بواسطة Express و MongoDB و JWT',
      contact: {
        name: 'API Support Team'
      }
    },
    servers: [
      {
        url: '/',
        description: 'الخادم الحالي (Current Server)'
      },
      {
        url: 'https://express-users-api-phi.vercel.app',
        description: 'خادم Vercel الإنتاجي'
      },
      {
        url: 'http://localhost:3000',
        description: 'خادم التطوير المحلي'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'أدخل رمز الـ JWT Token هنا (بدون كلمة Bearer يدوياً)'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '67138f2b1c4e9a0012345678' },
            name: { type: 'string', example: 'Ahmed Ali' },
            email: { type: 'string', example: 'ahmed@example.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            isActive: { type: 'boolean', example: true },
            age: { type: 'number', example: 25 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalItems: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 2 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'تم تسجيل الدخول بنجاح' },
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI...' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'رسالة الخطأ' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'صيغة البريد الإلكتروني غير صحيحة' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export { swaggerSpec };
export default swaggerSpec;
