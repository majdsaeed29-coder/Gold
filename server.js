require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const userRoutes = require('./backend/routes/userRoutes');

const app = express();

// Middleware الأساسي
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:"],
        },
    },
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ **خدمة الملفات الثابتة من مجلد frontend**
app.use(express.static(path.join(__dirname, 'frontend'), {
    maxAge: '1d', // تخزين مؤقت للملفات
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// ✅ **خدمة الـCSS والـJS بشكل منفصل**
app.use('/css', express.static(path.join(__dirname, 'frontend/css'), { maxAge: '7d' }));
app.use('/js', express.static(path.join(__dirname, 'frontend/js'), { maxAge: '7d' }));
app.use('/assets', express.static(path.join(__dirname, 'frontend/assets'), { maxAge: '30d' }));

// Middleware لمراقبة الطلبات (للتحقق من عمل النظام)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Request Body:', req.body);
    }
    next();
});

// Routes API
app.use('/api/users', userRoutes);

// ✅ **فحص صحة الخادم**
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'الخادم يعمل بشكل ممتاز',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});

// ✅ **معلومات عن النظام**
app.get('/api/info', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: 'نظام إدارة المستخدمين',
            version: '2.0.0',
            description: 'نظام متكامل لإدارة المستخدمين مع تشفير كلمات المرور',
            author: 'النظام العربي المتكامل',
            features: [
                'تسجيل وتسجيل دخول آمن',
                'تشفير كلمات المرور باستخدام bcrypt',
                'مصادقة باستخدام JWT',
                'إدارة صلاحيات متعددة',
                'واجهة عربية متكاملة',
                'بحث وتصفية المستخدمين'
            ]
        }
    });
});

// ✅ **جميع طلبات الصفحات ترجع الـindex.html (لتطبيق صفحة واحدة - SPA)**
app.get(['/', '/login', '/register', '/profile', '/users'], (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ **تحميل مستخدم افتراضي عند التشغيل الأول**
app.post('/api/setup/default-admin', async (req, res) => {
    try {
        const db = require('./backend/config/database');
        const bcrypt = require('bcryptjs');
        
        const adminData = {
            username: 'admin',
            email: 'admin@system.com',
            password: await bcrypt.hash('Admin@123', 12),
            full_name: 'المسؤول الرئيسي',
            role: 'admin',
            is_active: true
        };

        // التحقق من وجود المسؤول مسبقاً
        const checkSql = 'SELECT id FROM users WHERE email = ? OR username = ?';
        const existing = await db.query(checkSql, [adminData.email, adminData.username]);
        
        if (existing.length === 0) {
            const insertSql = `
                INSERT INTO users (username, email, password, full_name, role, is_active) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.query(insertSql, [
                adminData.username,
                adminData.email,
                adminData.password,
                adminData.full_name,
                adminData.role,
                adminData.is_active
            ]);
            
            res.status(201).json({
                success: true,
                message: 'تم إنشاء حساب المسؤول الافتراضي بنجاح',
                credentials: {
                    email: 'admin@system.com',
                    password: 'Admin@123'
                }
            });
        } else {
            res.status(200).json({
                success: true,
                message: 'حساب المسؤول موجود بالفعل'
            });
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إنشاء المسؤول الافتراضي'
        });
    }
});

// ✅ **نسخة احتياطية للبيانات**
app.get('/api/backup/users', async (req, res) => {
    try {
        const db = require('./backend/config/database');
        const users = await db.query(`
            SELECT id, username, email, full_name, phone, role, is_active, created_at 
            FROM users 
            ORDER BY id
        `);
        
        res.status(200).json({
            success: true,
            data: users,
            count: users.length,
            backup_date: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إنشاء النسخة الاحتياطية'
        });
    }
});

// ✅ **إعادة تعيين النظام (للتطوير فقط)**
if (process.env.NODE_ENV === 'development') {
    app.post('/api/reset/system', async (req, res) => {
        try {
            const db = require('./backend/config/database');
            await db.query('DELETE FROM users WHERE username != "admin"');
            
            res.status(200).json({
                success: true,
                message: 'تم إعادة تعيين النظام (تم الاحتفاظ بحساب المسؤول فقط)'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'حدث خطأ في إعادة التعيين'
            });
        }
    });
}

// ✅ **فحص قاعدة البيانات**
app.get('/api/database/status', async (req, res) => {
    try {
        const db = require('./backend/config/database');
        const [result] = await db.query('SELECT 1 as connected');
        
        res.status(200).json({
            success: true,
            message: 'قاعدة البيانات متصلة بنجاح',
            database: {
                host: process.env.DB_HOST,
                name: process.env.DB_NAME,
                status: 'connected'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'فشل الاتصال بقاعدة البيانات',
            error: error.message
        });
    }
});

// ✅ **إحصائيات النظام**
app.get('/api/stats', async (req, res) => {
    try {
        const db = require('./backend/config/database');
        
        const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users');
        const [activeUsers] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
        const [adminsCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        const [todayLogins] = await db.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE DATE(last_login) = CURDATE()
        `);
        
        res.status(200).json({
            success: true,
            data: {
                total_users: totalUsers[0].count,
                active_users: activeUsers[0].count,
                admin_users: adminsCount[0].count,
                today_logins: todayLogins[0].count,
                system_uptime: process.uptime()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الإحصائيات'
        });
    }
});

// ✅ **تعطيل الخدمات في وضع الصيانة**
let maintenanceMode = false;
app.post('/api/maintenance/toggle', (req, res) => {
    if (req.headers['x-admin-key'] === 'super-secret-key') {
        maintenanceMode = !maintenanceMode;
        res.status(200).json({
            success: true,
            message: `وضع الصيانة ${maintenanceMode ? 'مفعل' : 'معطل'}`,
            maintenance_mode: maintenanceMode
        });
    } else {
        res.status(403).json({
            success: false,
            message: 'غير مصرح بالوصول'
        });
    }
});

app.use((req, res, next) => {
    if (maintenanceMode && !req.path.startsWith('/api/maintenance')) {
        return res.status(503).json({
            success: false,
            message: 'النظام قيد الصيانة، الرجاء المحاولة لاحقاً'
        });
    }
    next();
});

// معالج الأخطاء 404 لـ API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'نقطة API غير موجودة',
        path: req.originalUrl,
        available_endpoints: [
            '/api/users/register',
            '/api/users/login',
            '/api/users/profile',
            '/api/users',
            '/api/health',
            '/api/info'
        ]
    });
});

// ✅ **جميع الطلبات الأخرى ترجع index.html لتطبيق SPA**
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    }
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
    console.error('🔴 خطأ في الخادم:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'حدث خطأ غير متوقع في الخادم';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            path: req.path 
        })
    });
});

// ✅ **بدء الخادم مع معالجة الأخطاء**
const startServer = async () => {
    try {
        // التحقق من وجود متغيرات البيئة المطلوبة
        const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            console.error('❌ متغيرات البيئة المطلوبة مفقودة:', missingEnvVars);
            console.log('📝 الرجاء تعبئة ملف .env بالمعلومات المطلوبة');
            process.exit(1);
        }
        
        // التحقق من اتصال قاعدة البيانات
        const db = require('./backend/config/database');
        await db.testConnection();
        
        // إنشاء جدول المستخدمين إذا لم يكن موجوداً
        const UserModel = require('./backend/models/userModel');
        await UserModel.initializeTable();
        
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n' + '='.repeat(50));
            console.log('🚀 **نظام إدارة المستخدمين يعمل الآن!**');
            console.log('='.repeat(50));
            console.log(`✅ الخادم يعمل على: http://localhost:${PORT}`);
            console.log(`🌍 الإتصال الخارجي: http://${getIPAddress()}:${PORT}`);
            console.log(`📊 حالة النظام: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️  قاعدة البيانات: ${process.env.DB_NAME}`);
            console.log('='.repeat(50));
            console.log('\n🔑 **حسابات افتراضية:**');
            console.log('   📧 admin@system.com / Admin@123 (مسؤول)');
            console.log('\n📌 **نقاط API متاحة:**');
            console.log('   • POST /api/users/register - تسجيل مستخدم جديد');
            console.log('   • POST /api/users/login - تسجيل الدخول');
            console.log('   • GET /api/users/profile - الملف الشخصي');
            console.log('   • GET /api/health - فحص صحة الخادم');
            console.log('   • GET /api/info - معلومات النظام');
            console.log('='.repeat(50));
        });
        
        // معالجة إغلاق الخادم بشكل أنيق
        process.on('SIGTERM', () => {
            console.log('\n🛑 تلقي إشارة إيقاف...');
            server.close(() => {
                console.log('✅ الخادم توقف بشكل آمن');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log('\n🛑 تلقي إشارة مقاطعة (Ctrl+C)...');
            server.close(() => {
                console.log('✅ الخادم توقف بشكل آمن');
                process.exit(0);
            });
        });
        
        // معالجة الأخطاء غير المعالجة
        process.on('uncaughtException', (error) => {
            console.error('⚠️ خطأ غير معالج:', error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('⚠️ وعد مرفوض غير معالج:', reason);
        });
        
    } catch (error) {
        console.error('❌ فشل في بدء الخادم:', error.message);
        console.log('🔧 تحقق من:');
        console.log('   1. هل قاعدة البيانات شغالة؟');
        console.log('   2. هل إعدادات ملف .env صحيحة؟');
        console.log('   3. هل المنفذ 3000 مشغول؟');
        process.exit(1);
    }
};

// دالة للحصول على عنوان IP
function getIPAddress() {
    const interfaces = require('os').networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// بدء الخادم
startServer();

module.exports = app; // للاختبارات
