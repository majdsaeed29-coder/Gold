const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

class AuthMiddleware {
    // التحقق من التوكن
    async verifyToken(req, res, next) {
        try {
            const token = this.extractToken(req);
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'لم يتم توفير رمز الدخول'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UserModel.findById(decoded.userId);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'المستخدم غير موجود'
                });
            }

            req.user = user;
            req.userId = decoded.userId;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'انتهت صلاحية رمز الدخول'
                });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'رمز الدخول غير صالح'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'خطأ في المصادقة'
            });
        }
    }

    // التحقق من الصلاحيات (Admin فقط)
    requireAdmin(req, res, next) {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول إلى هذه الصفحة'
            });
        }
    }

    // التحقق من الصلاحيات (Admin أو Moderator)
    requireAdminOrModerator(req, res, next) {
        if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول إلى هذه الصفحة'
            });
        }
    }

    // التحقق من أن المستخدم يملك الحساب أو هو Admin
    requireOwnershipOrAdmin(req, res, next) {
        const requestedUserId = parseInt(req.params.id);
        const currentUserId = req.userId;

        if (req.user.role === 'admin' || currentUserId === requestedUserId) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالتعديل على هذا الحساب'
            });
        }
    }

    // استخراج التوكن من الطلب
    extractToken(req) {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            return req.headers.authorization.split(' ')[1];
        }
        return req.headers['x-access-token'] || req.query.token || req.cookies?.token;
    }

    // إنشاء التوكن
    generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
    }
}

module.exports = new AuthMiddleware();
