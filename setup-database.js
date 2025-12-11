// setup-database.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    console.log('🔧 بدء إعداد قاعدة البيانات...');
    
    let connection;
    try {
        // الاتصال بقاعدة البيانات الرئيسية
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ تم الاتصال بخادم MySQL');
        
        // إنشاء قاعدة البيانات إذا لم تكن موجودة
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`✅ قاعدة البيانات "${process.env.DB_NAME}" جاهزة`);
        
        // استخدام قاعدة البيانات
        await connection.query(`USE \`${process.env.DB_NAME}\``);
        
        // إنشاء جدول المستخدمين
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                phone VARCHAR(20),
                role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await connection.query(createTableSQL);
        console.log('✅ جدول المستخدمين جاهز');
        
        // إضافة فهارس
        await connection.query('CREATE INDEX IF NOT EXISTS idx_email ON users(email)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_username ON users(username)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_role ON users(role)');
        console.log('✅ الفهارس جاهزة');
        
        console.log('\n🎉 تم إعداد قاعدة البيانات بنجاح!');
        console.log('\n📋 معلومات الاتصال:');
        console.log(`   الخادم: ${process.env.DB_HOST}`);
        console.log(`   قاعدة البيانات: ${process.env.DB_NAME}`);
        console.log(`   المستخدم: ${process.env.DB_USER}`);
        
    } catch (error) {
        console.error('❌ خطأ في إعداد قاعدة البيانات:', error.message);
        console.log('\n🔧 تحقق من:');
        console.log('   1. هل MySQL شغال؟');
        console.log('   2. هل إعدادات الاتصال صحيحة في ملف .env؟');
        console.log('   3. هل لديك صلاحيات كافية؟');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 تم إغلاق الاتصال بقاعدة البيانات');
        }
    }
}

setupDatabase();
