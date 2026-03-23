const API_BASE_CANDIDATES = [
    '/api',
    `${window.location.protocol}//${window.location.hostname}:3090/api`,
    `${window.location.protocol}//${window.location.hostname}:3000/api`
];

const SEEDED_ADMIN_USERNAME = 'admin';

let resolvedApiBaseUrl = localStorage.getItem('api_base_url') || API_BASE_CANDIDATES[0];
let authToken = localStorage.getItem('auth_token') || null;

let users = [];
let projects = [];
let activeUserRef = null;

const elements = {
    backToHomeBtn: document.getElementById('back-to-home-btn'),
    showAddUserBtn: document.getElementById('show-add-user-btn'),
    userList: document.getElementById('user-list'),
    addUserForm: document.getElementById('add-user-form'),
    cancelAddUserBtn: document.getElementById('cancel-add-user-btn'),
    newDisplayName: document.getElementById('new-display-name'),
    newEmail: document.getElementById('new-email'),
    newPassword: document.getElementById('new-password'),
    newIsAdmin: document.getElementById('new-is-admin'),
    userDetailForm: document.getElementById('user-detail-form'),
    detailUserRef: document.getElementById('detail-user-ref'),
    detailDisplayName: document.getElementById('detail-display-name'),
    detailEmail: document.getElementById('detail-email'),
    detailPassword: document.getElementById('detail-password'),
    detailIsAdmin: document.getElementById('detail-is-admin'),
    permissionForm: document.getElementById('permission-form'),
    permProjectSelect: document.getElementById('perm-project-select'),
    permCanView: document.getElementById('perm-can-view'),
    permCanEdit: document.getElementById('perm-can-edit'),
    permissionList: document.getElementById('permission-list'),
    feedback: document.getElementById('um-feedback'),
    userCount: document.getElementById('user-count')
};

document.addEventListener('DOMContentLoaded', initPage);

async function initPage() {
    elements.backToHomeBtn.addEventListener('click', () => {
        window.location.href = '/';
    });

    elements.showAddUserBtn.addEventListener('click', openCreateUserForm);
    elements.cancelAddUserBtn.addEventListener('click', closeCreateUserForm);
    elements.addUserForm.addEventListener('submit', saveNewUser);
    elements.userDetailForm.addEventListener('submit', saveUserDetail);
    elements.permissionForm.addEventListener('submit', savePermission);

    elements.permCanEdit.addEventListener('change', () => {
        if (elements.permCanEdit.checked) {
            elements.permCanView.checked = true;
        }
    });

    const ok = await assertSeededAdmin();
    if (!ok) {
        return;
    }

    await loadInitialData();
}

function isSeededAdmin(user) {
    return Boolean(user && user.is_admin && String(user.username || '').toLowerCase() === SEEDED_ADMIN_USERNAME);
}

function setFeedback(message, type = 'info') {
    elements.feedback.textContent = message || '';
    elements.feedback.className = `um-feedback ${type}`;
}

function openCreateUserForm() {
    elements.addUserForm.style.display = 'block';
    elements.newDisplayName.focus();
}

function closeCreateUserForm() {
    elements.addUserForm.reset();
    elements.addUserForm.style.display = 'none';
}

async function assertSeededAdmin() {
    if (!authToken) {
        window.location.href = '/login.html';
        return false;
    }

    try {
        const me = await apiFetch('/auth/me');
        if (!me.success || !isSeededAdmin(me.data)) {
            window.location.href = '/';
            return false;
        }
        return true;
    } catch (error) {
        window.location.href = '/login.html';
        return false;
    }
}

async function apiFetch(path, options = {}, requireToken = true) {
    const candidates = [resolvedApiBaseUrl, ...API_BASE_CANDIDATES].filter((v, i, arr) => v && arr.indexOf(v) === i);

    let lastError = null;
    for (const baseUrl of candidates) {
        try {
            const result = await apiFetchWithBase(baseUrl, path, options, requireToken);
            resolvedApiBaseUrl = baseUrl;
            localStorage.setItem('api_base_url', baseUrl);
            return result;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('API connection failed');
}

async function apiFetchWithBase(baseUrl, path, options = {}, requireToken = true) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (requireToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json')
        ? await response.json()
        : { success: false, error: `Unexpected response (${response.status})` };

    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }

    if (response.status === 404) {
        throw new Error(`API not found at ${baseUrl}`);
    }

    return result;
}

async function loadInitialData() {
    setFeedback('กำลังโหลดข้อมูลผู้ใช้...', 'info');
    const [usersResult, projectsResult] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/users/projects')
    ]);

    if (!usersResult.success || !projectsResult.success) {
        setFeedback(usersResult.error || projectsResult.error || 'โหลดข้อมูลไม่สำเร็จ', 'error');
        return;
    }

    users = usersResult.data || [];
    projects = projectsResult.data || [];
    elements.userCount.textContent = `${users.length} users`;

    renderUserList();
    renderProjectOptions();

    if (!users.length) {
        setFeedback('ยังไม่มีผู้ใช้ในระบบ', 'info');
        return;
    }

    const stillExists = users.some((user) => Number(user.user_ref) === Number(activeUserRef));
    if (!stillExists) {
        activeUserRef = users[0].user_ref;
    }

    await selectUser(activeUserRef);
    setFeedback('พร้อมใช้งาน', 'success');
}

function renderUserList() {
    if (!users.length) {
        elements.userList.innerHTML = '<p class="empty-permission">ยังไม่มีผู้ใช้</p>';
        return;
    }

    elements.userList.innerHTML = users.map((user) => {
        return `
            <button class="um-user-item ${activeUserRef === user.user_ref ? 'active' : ''}" data-user-ref="${user.user_ref}">
                <div class="um-user-name-wrap">
                    <div class="um-user-name">${user.display_name}</div>
                    ${user.is_admin ? '<span class="um-mini-badge">admin</span>' : ''}
                </div>
                <div class="um-user-email">${user.email}</div>
            </button>
        `;
    }).join('');

    elements.userList.querySelectorAll('.um-user-item').forEach((btn) => {
        btn.addEventListener('click', async () => {
            await selectUser(Number(btn.dataset.userRef));
        });
    });
}

async function selectUser(userRef) {
    activeUserRef = userRef;
    renderUserList();
    setFeedback('กำลังโหลดรายละเอียดผู้ใช้...', 'info');

    const detailResult = await apiFetch(`/users/${userRef}`);
    if (!detailResult.success) {
        setFeedback(detailResult.error || 'โหลดรายละเอียดผู้ใช้ไม่สำเร็จ', 'error');
        return;
    }

    const detail = detailResult.data;
    elements.detailUserRef.value = userRef;
    elements.detailDisplayName.value = detail.display_name || '';
    elements.detailEmail.value = detail.email || '';
    elements.detailPassword.value = '';
    elements.detailIsAdmin.checked = detail.is_admin === true;

    await loadUserPermissions(userRef);
    setFeedback('โหลดข้อมูลผู้ใช้สำเร็จ', 'success');
}

function renderProjectOptions() {
    if (!projects.length) {
        elements.permProjectSelect.innerHTML = '<option value="">ไม่มีโปรเจ็กต์</option>';
        return;
    }

    elements.permProjectSelect.innerHTML = projects.map((project) => (
        `<option value="${project.id}">${project.name}</option>`
    )).join('');
}

async function saveUserDetail(event) {
    event.preventDefault();

    const userRef = Number(elements.detailUserRef.value);
    const email = elements.detailEmail.value.trim().toLowerCase();
    const displayName = elements.detailDisplayName.value.trim();
    const password = elements.detailPassword.value;
    const isAdmin = elements.detailIsAdmin.checked;

    if (!userRef || !email || !displayName) {
        setFeedback('กรุณากรอกข้อมูลให้ครบ', 'error');
        return;
    }

    const payload = { email, displayName, isAdmin };
    if (password) {
        payload.password = password;
    }

    setFeedback('กำลังบันทึกข้อมูลผู้ใช้...', 'info');

    let result;
    try {
        result = await apiFetch(`/users/${userRef}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    } catch (error) {
        setFeedback(error.message || 'เกิดข้อผิดพลาดระหว่างบันทึกผู้ใช้', 'error');
        return;
    }

    if (!result.success) {
        setFeedback(result.error || 'บันทึกผู้ใช้ไม่สำเร็จ', 'error');
        return;
    }

    setFeedback('บันทึกผู้ใช้สำเร็จ', 'success');
    await loadInitialData();
}

async function saveNewUser(event) {
    event.preventDefault();

    const displayName = elements.newDisplayName.value.trim();
    const email = elements.newEmail.value.trim().toLowerCase();
    const password = elements.newPassword.value;
    const isAdmin = elements.newIsAdmin.checked;

    if (!displayName || !email || !password) {
        setFeedback('กรุณากรอกข้อมูลผู้ใช้ใหม่ให้ครบ', 'error');
        return;
    }

    if (password.length < 6) {
        setFeedback('Password ต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
        return;
    }

    setFeedback('กำลังสร้างผู้ใช้...', 'info');

    const result = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ email, displayName, password, isAdmin })
    });

    if (!result.success) {
        setFeedback(result.error || 'สร้างผู้ใช้ไม่สำเร็จ', 'error');
        return;
    }

    closeCreateUserForm();
    await loadInitialData();

    const created = users.find((user) => String(user.email || '').toLowerCase() === email);
    if (created) {
        await selectUser(created.user_ref);
    }

    setFeedback('สร้างผู้ใช้สำเร็จ', 'success');
}

async function loadUserPermissions(userRef) {
    const result = await apiFetch(`/users/${userRef}/permissions`);
    if (!result.success) {
        elements.permissionList.innerHTML = '<p class="empty-permission">โหลดสิทธิ์ไม่สำเร็จ</p>';
        setFeedback(result.error || 'โหลดสิทธิ์ไม่สำเร็จ', 'error');
        return;
    }

    renderPermissionList(result.data || []);
}

function renderPermissionList(rows) {
    if (!rows.length) {
        elements.permissionList.innerHTML = '<p class="empty-permission">ยังไม่มีสิทธิ์โปรเจ็กต์</p>';
        return;
    }

    elements.permissionList.innerHTML = rows.map((row) => {
        const badges = [];
        if (row.can_view) {
            badges.push('<span class="permission-badge view">View</span>');
        }
        if (row.can_edit) {
            badges.push('<span class="permission-badge edit">Edit</span>');
        }

        return `
            <div class="permission-item">
                <div>
                    <div class="permission-user">${row.project_name}</div>
                    <div class="permission-meta">${badges.join(' ')}</div>
                </div>
                <button class="btn btn-sm btn-danger remove-perm-btn" data-project-id="${row.project_id}">ลบสิทธิ์</button>
            </div>
        `;
    }).join('');

    elements.permissionList.querySelectorAll('.remove-perm-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const projectId = Number(btn.dataset.projectId);
            await removePermission(projectId);
        });
    });
}

async function savePermission(event) {
    event.preventDefault();

    const userRef = Number(elements.detailUserRef.value);
    const projectId = Number(elements.permProjectSelect.value);
    const canEdit = elements.permCanEdit.checked;
    const canView = elements.permCanView.checked || canEdit;

    if (!projectId) {
        setFeedback('ยังไม่มีโปรเจ็กต์ให้กำหนดสิทธิ์', 'error');
        return;
    }

    const result = await apiFetch(`/users/${userRef}/permissions/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({ canView, canEdit })
    });

    if (!result.success) {
        setFeedback(result.error || 'บันทึกสิทธิ์ไม่สำเร็จ', 'error');
        return;
    }

    await loadUserPermissions(userRef);
    setFeedback('บันทึกสิทธิ์สำเร็จ', 'success');
}

async function removePermission(projectId) {
    const userRef = Number(elements.detailUserRef.value);
    const result = await apiFetch(`/users/${userRef}/permissions/${projectId}`, {
        method: 'DELETE',
        body: JSON.stringify({})
    });

    if (!result.success) {
        setFeedback(result.error || 'ลบสิทธิ์ไม่สำเร็จ', 'error');
        return;
    }

    await loadUserPermissions(userRef);
    setFeedback('ลบสิทธิ์สำเร็จ', 'success');
}
