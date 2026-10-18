const mongoose = require('mongoose');

/**
 * وظيفة الاتصال بقاعدة بيانات MongoDB باستخدام Mongoose
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/users-db';

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 // مهلة المحاولة 5 ثوانٍ
    });

    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
