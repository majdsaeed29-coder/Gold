const { body, param, query, validationResult } = require('express-validator');
const UserModel = require('../models/userModel');

class ValidationMiddleware {
    // التحقق من بيانات التسجيل
    validateRegister() {
        return [
            body('username')
                .trim()
                .notEmpty().withMessage('اسم المستخدم مطلوب')
                .isLength({ min: 3, max: 50 }).withMessage('اسم المستخدم يجب أن يكون بين 3 و50 حرف')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('اسم المستخدم يمكن أن يحتوي فقط على أحرف إنجليزية وأرقام وشرطة سفلية'),

            body('email')
                .trim()
                .notEmpty().withMessage('البريد الإلكتروني مطلوب')
                .isEmail().withMessage('البريد الإلكتروني غير صالح')
                .normalizeEmail()
                .custom(async (email) => {
                    const existingUser = await UserModel.findByEmail(email);
                    if (existingUser) {
                        throw new Error('البريد الإلكتروني مستخدم بالفعل');
                    }
                    return true;
                }),

            body('password')
                .notEmpty().withMessage('كلمة المرور مطلوبة')
                .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون على الأقل 8 أحرف')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
                .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، رقم، وررمز خاص'),

            body('confirmPassword')
                .notEmpty().withMessage('تأكيد كلمة المرور مطلوب')
                .custom((value, { req }) => {
                    if (value !== req.body.password) {
                        throw new Error('كلمتا المرور غير متطابقتين');
                    }
                    return true;
                }),

            body('full_name')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('الاسم الكامل يجب أن لا يتجاوز 100 حرف'),

            body('phone')
                .optional()
                .trim()
                .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
                .withMessage('رقم الهاتف غير صالح'),

            this.handleValidationErrors
        ];
    }

    // التحقق من بيانات تسجيل الدخول
    validateLogin() {
        return [
            body('email')
                .trim()
                .notEmpty().withMessage('البريد الإلكتروني مطلوب')
                .isEmail().withMessage('البريد الإلكتروني غير صالح')
                .normalizeEmail(),

            body('password')
                .notEmpty().withMessage('كلمة المرور مطلوبة'),

            this.handleValidationErrors
        ];
    }

    // التحقق من تحديث المستخدم
    validateUpdateUser() {
        return [
            param('id')
                .isInt().withMessage('معرّف المستخدم يجب أن يكون رقماً')
                .toInt(),

            body('full_name')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('الاسم الكامل يجب أن لا يتجاوز 100 حرف'),

            body('phone')
                .optional()
                .trim()
                .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
                .withMessage('رقم الهاتف غير صالح'),

            body('role')
                .optional()
                .isIn(['user', 'moderator', 'admin']).withMessage('الدور غير صالح'),

            this.handleValidationErrors
        ];
    }

    // التحقق من تغيير كلمة المرور
    validateChangePassword() {
        return [
            body('currentPassword')
                .notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),

            body('newPassword')
                .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
                .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون على الأقل 8 أحرف')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
                .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، رقم، وررمز خاص'),

            body('confirmPassword')
                .notEmpty().withMessage('تأكيد كلمة المرور مطلوب')
                .custom((value, { req }) => {
                    if (value !== req.body.newPassword) {
                        throw new Error('كلمتا المرور غير متطابقتين');
                    }
                    return true;
                }),

            this.handleValidationErrors
        ];
    }

    // التحقق من معرّف المستخدم
    validateUserId() {
        return [
            param('id')
                .isInt().withMessage('معرّف المستخدم يجب أن يكون رقماً')
                .toInt(),
            this.handleValidationErrors
        ];
    }

    // التحقق من بيانات البحث والتصفية
    validateGetUsers() {
        return [
            query('page')
                .optional()
                .isInt({ min: 1 }).withMessage('رقم الصفحة يجب أن يكون رقماً موجباً')
                .toInt(),

            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 }).withMessage('الحد يجب أن يكون بين 1 و 100')
                .toInt(),

            query('role')
                .optional()
                .isIn(['user', 'moderator', 'admin']).withMessage('الدور غير صالح'),

            query('search')
                .optional()
                .trim()
                .isLength({ max: 100 }).withMessage('بحث لا يمكن أن يتجاوز 100 حرف'),

            this.handleValidationErrors
        ];
    }

    // معالجة أخطاء التحقق
    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.param,
                message: error.msg
            }));

            return res.status(400).json({
                success: false,
                message: 'أخطاء في التحقق من البيانات',
                errors: errorMessages
            });
        }
        next();
    }
}

module.exports = new ValidationMiddleware();
