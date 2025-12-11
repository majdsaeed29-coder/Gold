// المتغيرات العامة
let currentUser = null;
let token = localStorage.getItem('token') || null;
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'all';
let currentSearch = '';

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// التحقق من حالة المصادقة
async function checkAuth() {
    if (token) {
        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    currentUser = data.data;
                    showAuthenticatedView();
                } else {
                    localStorage.removeItem('token');
                    token = null;
                    showPublicView();
                }
            } else {
                localStorage.removeItem('token');
                token = null;
                showPublicView();
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            localStorage.removeItem('token');
            token = null;
            showPublicView();
        }
    } else {
        showPublicView();
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // نموذج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // نموذج التسجيل
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        // تتبع قوة كلمة المرور
        document.getElementById('regPassword').addEventListener('input', checkPasswordStrength);
        document.getElementById('regConfirmPassword').addEventListener('input', validatePasswordMatch);
    }
    
    // نموذج تغيير كلمة المرور
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
    
    // نموذج تعديل المستخدم
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
    
    // حقل البحث
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUsers();
            }
        });
    }
}

// عرض الواجهة للمستخدم المصادق
function showAuthenticatedView() {
    document.getElementById('loginNav').style.display = 'none';
    document.getElementById('registerNav').style.display = 'none';
    document.getElementById('profileNav').style.display = 'flex';
    document.getElementById('logoutNav').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'flex';
    
    document.getElementById('usernameDisplay').textContent = currentUser.username;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'مسؤول' : 
                                                    currentUser.role === 'moderator' ? 'مشرف' : 'مستخدم';
    
    if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
        document.getElementById('usersNav').style.display = 'flex';
        document.getElementById('manageUsersBtn').style.display = 'block';
    }
    
    loadProfileData();
    showView('profile');
}

// عرض الواجهة للزوار
function showPublicView() {
    document.getElementById('loginNav').style.display = 'flex';
    document.getElementById('registerNav').style.display = 'flex';
    document.getElementById('profileNav').style.display = 'none';
    document.getElementById('usersNav').style.display = 'none';
    document.getElementById('logoutNav').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('manageUsersBtn').style.display = 'none';
    
    showView('home');
}

// التحكم في عرض الصفحات
function showView(viewName) {
    // إخفاء كل الصفحات
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    
    // إظهار الصفحة المطلوبة
    document.getElementById(viewName + 'View').style.display = 'block';
    
    // إذا كانت صفحة المستخدمين، تحميل البيانات
    if (viewName === 'users') {
        loadUsers();
    }
}

// تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoader();
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            token = data.data.token;
            localStorage.setItem('token', token);
            currentUser = data.data.user;
            
            showAlert('تم تسجيل الدخول بنجاح!', 'success');
            showAuthenticatedView();
        } else {
            showAlert(data.message || 'فشل تسجيل الدخول', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
        console.error('Login error:', error);
    } finally {
        hideLoader();
    }
}

// التسجيل
async function handleRegister(e) {
    e.preventDefault();
    
    const userData = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        confirmPassword: document.getElementById('regConfirmPassword').value,
        full_name: document.getElementById('regFullName').value || undefined,
        phone: document.getElementById('regPhone').value || undefined
    };
    
    // التحقق من صحة البيانات
    if (userData.password !== userData.confirmPassword) {
        showAlert('كلمتا المرور غير متطابقتين', 'error');
        return;
    }
    
    showLoader();
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول', 'success');
            document.getElementById('registerForm').reset();
            showView('login');
        } else {
            showAlert(data.message || 'فشل التسجيل', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
        console.error('Register error:', error);
    } finally {
        hideLoader();
    }
}

// تسجيل الخروج
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        token = null;
        currentUser = null;
        showPublicView();
        showAlert('تم تسجيل الخروج بنجاح', 'success');
    }
}

// تحميل بيانات الملف الشخصي
function loadProfileData() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent = 
        currentUser.role === 'admin' ? 'مسؤول' : 
        currentUser.role === 'moderator' ? 'مشرف' : 'مستخدم';
    
    document.getElementById('infoUsername').textContent = currentUser.username;
    document.getElementById('infoEmail').textContent = currentUser.email;
    document.getElementById('infoPhone').textContent = currentUser.phone || 'غير مضبوط';
    document.getElementById('infoCreatedAt').textContent = 
        new Date(currentUser.created_at).toLocaleDateString('ar-SA');
}

// تغيير كلمة المرور
async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showAlert('كلمتا المرور غير متطابقتين', 'error');
        return;
    }
    
    showLoader();
    
    try {
        const response = await fetch('/api/users/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword: confirmNewPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showAlert(data.message || 'فشل تغيير كلمة المرور', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
        console.error('Change password error:', error);
    } finally {
        hideLoader();
    }
}

// تحميل قائمة المستخدمين
async function loadUsers(page = 1) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return;
    }
    
    showLoader();
    
    try {
        let url = `/api/users?page=${page}&limit=10`;
        
        if (currentFilter !== 'all') {
            url += `&role=${currentFilter}`;
        }
        
        if (currentSearch) {
            url += `&search=${encodeURIComponent(currentSearch)}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderUsersTable(data.data);
            renderPagination(data.pagination);
        } else {
            showAlert(data.message || 'فشل تحميل المستخدمين', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
        console.error('Load users error:', error);
    } finally {
        hideLoader();
    }
}

// عرض جدول المستخدمين
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    لا توجد مستخدمين
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const roleText = user.role === 'admin' ? 'مسؤول' : 
                        user.role === 'moderator' ? 'مشرف' : 'مستخدم';
        const statusText = user.is_active ? 'نشط' : 'معطل';
        const statusClass = user.is_active ? 'status-active' : 'status-inactive';
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.full_name || '-'}</td>
            <td>${roleText}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>
                <div class="action-buttons">
                    ${user.id !== currentUser.id ? `
                        <button class="btn btn-action btn-info" onclick="editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.is_active ? 
                            `<button class="btn btn-action btn-warning" onclick="deactivateUser(${user.id})">
                                <i class="fas fa-ban"></i>
                            </button>` : 
                            `<button class="btn btn-action btn-success" onclick="activateUser(${user.id})">
                                <i class="fas fa-check"></i>
                            </button>`
                        }
                        ${user.role !== 'admin' ? `
                            <button class="btn btn-action btn-danger" onclick="deleteUser(${user.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    ` : `
                        <span class="text-muted">-</span>
                    `}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// تصفية المستخدمين
function filterUsers(filter) {
    currentFilter = filter;
    currentPage = 1;
    
    // تحديث أزرار التصفية
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadUsers(currentPage);
}

// البحث عن المستخدمين
function searchUsers() {
    currentSearch = document.getElementById('searchUsers').value;
    currentPage = 1;
    loadUsers(currentPage);
}

// تحرير مستخدم
async function editUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.data;
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editFullName').value = user.full_name || '';
            document.getElementById('editPhone').value = user.phone || '';
            document.getElementById('editRole').value = user.role;
            
            document.getElementById('editModal').classList.add('show');
        }
    } catch (error) {
        showAlert('حدث خطأ في جلب بيانات المستخدم', 'error');
    }
}

// حفظ تعديل المستخدم
async function handleEditUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const updateData = {
        full_name: document.getElementById('editFullName').value || undefined,
        phone: document.getElementById('editPhone').value || undefined,
        role: document.getElementById('editRole').value
    };
    
    showLoader();
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم تحديث بيانات المستخدم بنجاح', 'success');
            closeModal();
            loadUsers(currentPage);
        } else {
            showAlert(data.message || 'فشل تحديث المستخدم', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoader();
    }
}

// تعطيل مستخدم
async function deactivateUser(userId) {
    if (!confirm('هل أنت متأكد من تعطيل هذا المستخدم؟')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}/deactivate`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم تعطيل المستخدم بنجاح', 'success');
            loadUsers(currentPage);
        } else {
            showAlert(data.message || 'فشل تعطيل المستخدم', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
    }
}

// تفعيل مستخدم
async function activateUser(userId) {
    if (!confirm('هل أنت متأكد من تفعيل هذا المستخدم؟')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}/activate`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم تفعيل المستخدم بنجاح', 'success');
            loadUsers(currentPage);
        } else {
            showAlert(data.message || 'فشل تفعيل المستخدم', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
    }
}

// حذف مستخدم
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم حذف المستخدم بنجاح', 'success');
            loadUsers(currentPage);
        } else {
            showAlert(data.message || 'فشل حذف المستخدم', 'error');
        }
    } catch (error) {
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
    }
}

// عرض ترقيم الصفحات
function renderPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';
    
    totalPages = pagination.totalPages;
    
    // زر السابق
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        prevBtn.onclick = () => {
            currentPage--;
            loadUsers(currentPage);
        };
        paginationDiv.appendChild(prevBtn);
    }
    
    // أرقام الصفحات
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            loadUsers(currentPage);
        };
        paginationDiv.appendChild(pageBtn);
    }
    
    // زر التالي
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        nextBtn.onclick = () => {
            currentPage++;
            loadUsers(currentPage);
        };
        paginationDiv.appendChild(nextBtn);
    }
}

// إغلاق النافذة المنبثقة
function closeModal() {
    document.getElementById('editModal').classList.remove('show');
    document.getElementById('editUserForm').reset();
}

// التحقق من قوة كلمة المرور
function checkPasswordStrength() {
    const password = document.getElementById('regPassword').value;
    const strengthBar = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let color = '#e74c3c';
    let text = 'ضعيفة';
    
    // طول كلمة المرور
    if (password.length >= 8) strength += 25;
    
    // أحرف كبيرة وصغيرة
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    
    // أرقام
    if (/\d/.test(password)) strength += 25;
    
    // رموز خاصة
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    
    // تحديد القوة
    if (strength >= 75) {
        color = '#27ae60';
        text = 'قوية جداً';
    } else if (strength >= 50) {
        color = '#f39c12';
        text = 'جيدة';
    } else if (strength >= 25) {
        color = '#e67e22';
        text = 'ضعيفة';
    }
    
    strengthBar.style.width = strength + '%';
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = `قوة كلمة المرور: ${text}`;
    strengthText.style.color = color;
}

// التحقق من تطابق كلمتي المرور
function validatePasswordMatch() {
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorElement = document.getElementById('regConfirmPasswordError');
    
    if (confirmPassword && password !== confirmPassword) {
        errorElement.textContent = 'كلمتا المرور غير متطابقتين';
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }
}

// إظهار/إخفاء كلمة المرور
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.parentElement.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// عرض رسالة
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// عرض مؤشر التحميل
function showLoader() {
    let loader = document.getElementById('loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader';
        loader.className = 'loader';
        document.querySelector('.container').appendChild(loader);
    }
    loader.style.display = 'block';
}

// إخفاء مؤشر التحميل
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// تعديل الملف الشخصي
function editProfile() {
    showAlert('هذه الخاصية قيد التطوير', 'info');
}
