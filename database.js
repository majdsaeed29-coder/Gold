const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
        
        this.testConnection();
    }

    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
            connection.release();
        } catch (error) {
            console.error('❌ فشل الاتصال بقاعدة البيانات:', error.message);
            process.exit(1);
        }
    }

    async query(sql, params = []) {
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('❌ خطأ في تنفيذ الاستعلام:', error.message);
            throw error;
        }
    }

    async transaction(operations) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await operations(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new Database();
