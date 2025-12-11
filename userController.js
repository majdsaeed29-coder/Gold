const UserModel = require('../models/userModel');
const AuthMiddleware = require('../middleware/authMiddleware');

class UserController {
    // تسجيل مستخدم جديد
    async register(req, res) {
        try {
            const userData = {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                full_name: req.body.full_name,
                phone: req.body.phone,
                role: req.body.role || 'user'
            };

            const newUser = await UserModel.createUser(userData);
            
            // إنشاء توكن
            const token = AuthMiddleware.generateToken(newUser.id);

            res.status(201).json({
                success: true,
                message: 'تم تسجيل المستخدم بنجاح',
                data: {
                    user: newUser,
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء التسجيل'
            });
        }
    }

    // تسجيل الدخول
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // البحث عن المستخدم
            const user = await UserModel.findByEmail(email);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
                });
            }

            // التحقق من كلمة المرور
            const isPasswordValid = await UserModel.verifyPassword(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
                });
            }

            // تحديث وقت آخر تسجيل دخول
            await UserModel.updateLastLogin(user.id);

            // إنشاء توكن
            const token = AuthMiddleware.generateToken(user.id);

            // إعداد بيانات المستخدم للإرجاع (دون كلمة المرور)
            const userResponse = {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                role: user.role,
                created_at: user.created_at
            };

            res.status(200).json({
                success: true,
                message: 'تم تسجيل الدخول بنجاح',
                data: {
                    user: userResponse,
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تسجيل الدخول'
            });
        }
    }

    // الحصول على بيانات المستخدم الحالي
    async getProfile(req, res) {
        try {
            const user = await UserModel.findById(req.userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود'
                });
            }

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب بيانات المستخدم'
            });
        }
    }

    // تحديث بيانات المستخدم
    async updateProfile(req, res) {
        try {
            const userId = req.userId;
            const updateData = req.body;

            const updatedUser = await UserModel.updateUser(userId, updateData);

            res.status(200).json({
                success: true,
                message: 'تم تحديث بيانات المستخدم بنجاح',
                data: updatedUser
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تحديث البيانات'
            });
        }
    }

    // تغيير كلمة المرور
    async changePassword(req, res) {
        try {
            const userId = req.userId;
            const { currentPassword, newPassword } = req.body;

            // الحصول على المستخدم
            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود'
                });
            }

            // الحصول على كلمة المرور المشفرة
            const fullUser = await UserModel.findByEmail(user.email);

            // التحقق من كلمة المرور الحالية
            const isCurrentPasswordValid = await UserModel.verifyPassword(
                currentPassword,
                fullUser.password
            );

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'كلمة المرور الحالية غير صحيحة'
                });
            }

            // تحديث كلمة المرور
            await UserModel.updatePassword(userId, newPassword);

            res.status(200).json({
                success: true,
                message: 'تم تغيير كلمة المرور بنجاح'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تغيير كلمة المرور'
            });
        }
    }

    // جلب جميع المستخدمين (للمسؤولين)
    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                role: req.query.role,
                search: req.query.search
            };

            const result = await UserModel.getAllUsers(filters, page, limit);

            res.status(200).json({
                success: true,
                data: result.users,
                pagination: result.pagination
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب المستخدمين'
            });
        }
    }

    // جلب مستخدم بواسطة المعرف
    async getUserById(req, res) {
        try {
            const userId = parseInt(req.params.id);
            const user = await UserModel.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود'
                });
            }

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء جلب بيانات المستخدم'
            });
        }
    }

    // تحديث مستخدم (للمسؤولين)
    async updateUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            const updateData = req.body;

            const updatedUser = await UserModel.updateUser(userId, updateData);

            res.status(200).json({
                success: true,
                message: 'تم تحديث المستخدم بنجاح',
                data: updatedUser
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تحديث المستخدم'
            });
        }
    }

    // تعطيل مستخدم
    async deactivateUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            
            // منع تعطيل الحساب نفسه
            if (userId === req.userId) {
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكنك تعطيل حسابك الخاص'
                });
            }

            await UserModel.deactivateUser(userId);

            res.status(200).json({
                success: true,
                message: 'تم تعطيل المستخدم بنجاح'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تعطيل المستخدم'
            });
        }
    }

    // تفعيل مستخدم
    async activateUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            await UserModel.activateUser(userId);

            res.status(200).json({
                success: true,
                message: 'تم تفعيل المستخدم بنجاح'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء تفعيل المستخدم'
            });
        }
    }

    // حذف مستخدم
    async deleteUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            
            // منع حذف الحساب نفسه
            if (userId === req.userId) {
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكنك حذف حسابك الخاص'
                });
            }

            const deleted = await UserModel.deleteUser(userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود أو لا يمكن حذفه'
                });
            }

            res.status(200).json({
                success: true,
                message: 'تم حذف المستخدم بنجاح'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء حذف المستخدم'
            });
        }
    }
}

module.exports = new UserController();
