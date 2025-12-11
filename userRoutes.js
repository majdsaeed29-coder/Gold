const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const AuthMiddleware = require('../middleware/authMiddleware');
const ValidationMiddleware = require('../middleware/validationMiddleware');
const UserModel = require('../models/userModel');

// تهيئة جدول المستخدمين عند بدء التشغيل
UserModel.initializeTable().catch(console.error);

// المسارات العامة
router.post(
    '/register',
    ValidationMiddleware.validateRegister(),
    UserController.register
);

router.post(
    '/login',
    ValidationMiddleware.validateLogin(),
    UserController.login
);

// المسارات المحمية (تتطلب تسجيل دخول)
router.use(AuthMiddleware.verifyToken);

// ملف المستخدم الشخصي
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put(
    '/change-password',
    ValidationMiddleware.validateChangePassword(),
    UserController.changePassword
);

// إدارة المستخدمين (تتطلب صلاحيات خاصة)
router.get(
    '/',
    ValidationMiddleware.validateGetUsers(),
    AuthMiddleware.requireAdminOrModerator,
    UserController.getAllUsers
);

router.get(
    '/:id',
    ValidationMiddleware.validateUserId(),
    AuthMiddleware.requireOwnershipOrAdmin,
    UserController.getUserById
);

router.put(
    '/:id',
    ValidationMiddleware.validateUpdateUser(),
    AuthMiddleware.requireOwnershipOrAdmin,
    UserController.updateUser
);

// المسارات الخاصة بالمسؤولين فقط
router.put(
    '/:id/deactivate',
    ValidationMiddleware.validateUserId(),
    AuthMiddleware.requireAdmin,
    UserController.deactivateUser
);

router.put(
    '/:id/activate',
    ValidationMiddleware.validateUserId(),
    AuthMiddleware.requireAdmin,
    UserController.activateUser
);

router.delete(
    '/:id',
    ValidationMiddleware.validateUserId(),
    AuthMiddleware.requireAdmin,
    UserController.deleteUser
);

module.exports = router;
