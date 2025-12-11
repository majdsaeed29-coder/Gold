require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// Middleware
app.use(helmet()); // تحسين الأمان
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

// Route للتحقق من حالة الخادم
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'الخادم يعمل بشكل صحيح',
        timestamp: new Date().toISOString()
    });
});

// Route محمية للاختبار
app.get('/api/protected', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'هذا مسار محمي',
        user: req.user
    });
});

// معالج الأخطاء 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'الصفحة غير موجودة'
    });
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
    console.error('خطأ:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'حدث خطأ في الخادم';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// بدء الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});
