const db = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
    // إنشاء جدول المستخدمين إذا لم يكن موجودًا
    async initializeTable() {
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_username (username),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        try {
            await db.query(createTableSQL);
            console.log('✅ تم تهيئة جدول المستخدمين بنجاح');
        } catch (error) {
            console.error('❌ خطأ في إنشاء جدول المستخدمين:', error.message);
            throw error;
        }
    }

    // إنشاء مستخدم جديد
    async createUser(userData) {
        const {
            username,
            email,
            password,
            full_name,
            phone,
            role = 'user'
        } = userData;

        // تشفير كلمة المرور
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = `
            INSERT INTO users 
            (username, email, password, full_name, phone, role) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [username, email, hashedPassword, full_name, phone, role];
        
        try {
            const result = await db.query(sql, values);
            return {
                id: result.insertId,
                username,
                email,
                full_name,
                phone,
                role
            };
        } catch (error) {
            // معالجة الأخطاء الفريدة
            if (error.code === 'ER_DUP_ENTRY') {
                if (error.message.includes('username')) {
                    throw new Error('اسم المستخدم موجود مسبقاً');
                } else if (error.message.includes('email')) {
                    throw new Error('البريد الإلكتروني موجود مسبقاً');
                }
            }
            throw error;
        }
    }

    // البحث عن مستخدم بالبريد الإلكتروني
    async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
        const results = await db.query(sql, [email]);
        return results[0] || null;
    }

    // البحث عن مستخدم باسم المستخدم
    async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ? AND is_active = TRUE';
        const results = await db.query(sql, [username]);
        return results[0] || null;
    }

    // البحث عن مستخدم بالمعرف
    async findById(id) {
        const sql = 'SELECT id, username, email, full_name, phone, role, created_at FROM users WHERE id = ? AND is_active = TRUE';
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    // التحقق من كلمة المرور
    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // تحديث بيانات المستخدم
    async updateUser(id, updateData) {
        const allowedFields = ['full_name', 'phone', 'role'];
        const updates = [];
        const values = [];

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        if (updates.length === 0) {
            throw new Error('لا توجد بيانات صالحة للتحديث');
        }

        values.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        await db.query(sql, values);
        return this.findById(id);
    }

    // تحديث كلمة المرور
    async updatePassword(id, newPassword) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const sql = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [hashedPassword, id]);
    }

    // تحديث وقت آخر تسجيل دخول
    async updateLastLogin(id) {
        const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [id]);
    }

    // تعطيل حساب المستخدم
    async deactivateUser(id) {
        const sql = 'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [id]);
    }

    // تفعيل حساب المستخدم
    async activateUser(id) {
        const sql = 'UPDATE users SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [id]);
    }

    // جلب جميع المستخدمين (مع التصفية والترتيب)
    async getAllUsers(filters = {}, page = 1, limit = 10) {
        let sql = 'SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const values = [];
        const countValues = [];

        // تطبيق الفلاتر
        if (filters.role) {
            sql += ' AND role = ?';
            countSql += ' AND role = ?';
            values.push(filters.role);
            countValues.push(filters.role);
        }

        if (filters.search) {
            sql += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            countSql += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
            countValues.push(searchTerm, searchTerm, searchTerm);
        }

        // الترتيب
        sql += ' ORDER BY created_at DESC';

        // التصفية حسب الصفحة
        const offset = (page - 1) * limit;
        sql += ' LIMIT ? OFFSET ?';
        values.push(limit, offset);

        const [users, countResult] = await Promise.all([
            db.query(sql, values),
            db.query(countSql, countValues)
        ]);

        return {
            users,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        };
    }

    // حذف مستخدم (فعلي)
    async deleteUser(id) {
        const sql = 'DELETE FROM users WHERE id = ? AND role != "admin"';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }
}

module.exports = new UserModel();
