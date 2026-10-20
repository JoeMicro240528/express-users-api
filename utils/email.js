import nodemailer from 'nodemailer';

/**
 * دالة مساعدة لإرسال رسائل البريد الإلكتروني
 * تدعم خوادم SMTP الحقيقية (Mailtrap, Gmail, Brevo, SendGrid, etc.)
 * وتوفر محاكاة وطباعة تفاعلية في الكونسول أثناء التطوير عند عدم توفر بيانات SMTP
 */
const sendEmail = async ({ to, subject, text, html, resetUrl }) => {
  const hasSmtpConfig = Boolean(
    process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS
  );

  // إذا لم يتم تهيئة بيانات الـ SMTP في ملف .env يتم محاكاة الإرسال وطباعتها في الكونسول لتسهيل الاختبار
  if (!hasSmtpConfig) {
    console.log('\n================== [ EMAIL SIMULATION ] ==================');
    console.log(`To:        ${to}`);
    console.log(`Subject:   ${subject}`);
    console.log(`Text:      ${text}`);
    if (resetUrl) {
      console.log(`Reset Link: ${resetUrl}`);
    }
    console.log('==========================================================\n');
    return;
  }

  // إنشاء ناقل البريد
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // خيارات الرسالة
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Express Users API" <noreply@express-users-api.com>',
    to,
    subject,
    text,
    html: html || `<p style="font-family: sans-serif; font-size: 16px;">${text}</p>`
  };

  await transporter.sendMail(mailOptions);
};

export { sendEmail };
export default sendEmail;
