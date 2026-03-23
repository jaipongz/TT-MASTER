const API_BASE_CANDIDATES = [
    '/api',
    `${window.location.protocol}//${window.location.hostname}:3090/api`,
    `${window.location.protocol}//${window.location.hostname}:3000/api`
];

const THAI_TIMEZONE = 'Asia/Bangkok';

let resolvedApiBaseUrl = localStorage.getItem('api_base_url') || API_BASE_CANDIDATES[0];

let currentProject = null;
let editor = null;
let authToken = localStorage.getItem('auth_token') || null;
let currentUser = null;
let hasUnsavedChanges = false;
let autoRefreshTimeout = null;
let lockHeartbeatInterval = null;
let activeLockProjectId = null;

const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    newProjectBtn: document.getElementById('new-project-btn'),
    projectsList: document.getElementById('projects-list'),
    projectModal: document.getElementById('project-modal'),
    projectForm: document.getElementById('project-form'),
    closeModalBtns: document.querySelectorAll('.close-modal'),
    pageTitle: document.getElementById('page-title'),
    projectInfoSection: document.getElementById('project-info-section'),
    editorSection: document.getElementById('editor-section'),
    welcomeSection: document.getElementById('welcome-section'),
    saveBtn: document.getElementById('save-btn'),
    validateBtn: document.getElementById('validate-btn'),
    formatBtn: document.getElementById('format-btn'),
    clearBtn: document.getElementById('clear-btn'),
    editProjectBtn: document.getElementById('edit-project-btn'),
    deleteProjectBtn: document.getElementById('delete-project-btn'),
    manageAccessBtn: document.getElementById('manage-access-btn'),
    getStartedBtn: document.getElementById('get-started-btn'),
    projectNameDisplay: document.getElementById('project-name-display'),
    projectDescDisplay: document.getElementById('project-desc-display'),
    projectUpdated: document.getElementById('project-updated'),
    projectLastEditor: document.getElementById('project-last-editor'),
    lastSavedMessage: document.getElementById('last-saved-message'),
    lastSavedTime: document.getElementById('last-saved-time'),
    saveIndicator: document.getElementById('save-indicator'),
    saveMessage: document.getElementById('save-message'),
    saveStatus: document.getElementById('save-status'),
    notificationArea: document.getElementById('notification-area'),

    sidebarUser: document.getElementById('sidebar-user'),
    currentUserName: document.getElementById('current-user-name'),
    currentUserUsername: document.getElementById('current-user-username'),
    logoutBtn: document.getElementById('logout-btn'),

    adminSection: document.getElementById('admin-section'),
    userManagementBtn: document.getElementById('user-management-btn'),

    permissionModal: document.getElementById('permission-modal'),
    permissionClose: document.querySelector('.permission-close'),
    grantPermissionForm: document.getElementById('grant-permission-form'),
    grantEmailInput: document.getElementById('grant-email'),
    grantCanEdit: document.getElementById('grant-can-edit'),
    permissionList: document.getElementById('permission-list'),

    lockModal: document.getElementById('lock-modal'),
    lockMessage: document.getElementById('lock-message'),
    lockCancelBtn: document.getElementById('lock-cancel-btn'),
    lockTakeoverBtn: document.getElementById('lock-takeover-btn')
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    loadTheme();
    setupEventListeners();
    initJSONEditor();
    elements.saveBtn.style.display = 'none';

    if (!authToken) {
        redirectToLogin();
        return;
    }

    await restoreSession();
}

function setupEventListeners() {
    elements.themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
        setTheme(newTheme);
    });

    elements.newProjectBtn.addEventListener('click', () => showProjectModal());
    elements.getStartedBtn.addEventListener('click', () => showProjectModal());

    elements.closeModalBtns.forEach((btn) => {
        btn.addEventListener('click', closeModal);
    });

    elements.projectModal.addEventListener('click', (e) => {
        if (e.target === elements.projectModal) {
            closeModal();
        }
    });

    elements.projectForm.addEventListener('submit', handleProjectSubmit);

    elements.saveBtn.addEventListener('click', saveJSON);
    elements.validateBtn.addEventListener('click', validateJSON);
    elements.formatBtn.addEventListener('click', formatJSON);
    elements.clearBtn.addEventListener('click', clearJSON);

    elements.editProjectBtn.addEventListener('click', () => {
        if (currentProject) {
            showProjectModal(currentProject);
        }
    });

    elements.deleteProjectBtn.addEventListener('click', deleteProject);
    elements.manageAccessBtn.addEventListener('click', openPermissionModal);

    elements.logoutBtn.addEventListener('click', logout);

    elements.grantPermissionForm.addEventListener('submit', grantPermission);
    elements.permissionClose.addEventListener('click', closePermissionModal);
    elements.permissionModal.addEventListener('click', (e) => {
        if (e.target === elements.permissionModal) {
            closePermissionModal();
        }
    });

    elements.userManagementBtn.addEventListener('click', () => {
        window.location.href = '/user-management.html';
    });

    window.addEventListener('beforeunload', releaseLockOnUnload);
}

function redirectToLogin() {
    window.location.href = '/login.html';
}

async function restoreSession() {
    try {
        const result = await apiFetch('/auth/me');
        if (!result.success) {
            throw new Error(result.error || 'Session expired');
        }

        setCurrentUser(result.data);
        await loadProjects();
    } catch (error) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('auth_token');
        redirectToLogin();
    }
}

function setCurrentUser(user) {
    currentUser = user;
    elements.sidebarUser.style.display = 'block';
    elements.currentUserName.textContent = user.display_name || user.email;
    elements.currentUserUsername.textContent = user.email || '';
    elements.adminSection.style.display = isSeededAdmin(user) ? 'block' : 'none';
    applyRoleVisibility();
}

function applyRoleVisibility() {
    const isAdmin = Boolean(currentUser && currentUser.is_admin);

    elements.newProjectBtn.style.display = isAdmin ? 'flex' : 'none';
    elements.deleteProjectBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    elements.clearBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    elements.manageAccessBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    elements.getStartedBtn.style.display = isAdmin ? 'inline-flex' : 'none';
}

function isSeededAdmin(user) {
    return Boolean(user && user.is_admin && String(user.username || '').toLowerCase() === 'admin');
}

async function logout() {
    try {
        await releaseCurrentLock();
        if (authToken) {
            await apiFetch('/auth/logout', { method: 'POST' });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('auth_token');
        redirectToLogin();
    }
}

async function apiFetch(path, options = {}, requireToken = true) {
    const candidates = [resolvedApiBaseUrl, ...API_BASE_CANDIDATES].filter(
        (value, index, arr) => value && arr.indexOf(value) === index
    );

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
        if (!authToken) {
            throw new Error('Not authenticated');
        }
        headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers
    });

    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json')
        ? await response.json()
        : { success: false, error: `Unexpected response (${response.status})` };

    if (response.status === 404) {
        throw new Error(`API not found at ${baseUrl}`);
    }

    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        redirectToLogin();
    }

    return result;
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.body.className = `${theme}-theme`;
    localStorage.setItem('theme', theme);

    const icon = elements.themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i> ธีมสว่าง';
    } else {
        icon.className = 'fas fa-moon';
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i> ธีมมืด';
    }
}

async function loadProjects() {
    try {
        showLoading();
        const result = await apiFetch('/projects');

        if (result.success) {
            renderProjects(result.data);
        } else {
            showNotification('error', 'ไม่สามารถโหลดโปรเจคได้', result.error || 'เกิดข้อผิดพลาด');
        }
    } catch (error) {
        showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', error.message);
    } finally {
        hideLoading();
    }
}

function renderProjects(projects) {
    elements.projectsList.innerHTML = '';

    if (!projects || projects.length === 0) {
        elements.projectsList.innerHTML = '<div class="empty-state"><p>ยังไม่มีโปรเจคที่คุณเข้าถึงได้</p></div>';
        return;
    }

    projects.forEach((project) => {
        const projectEl = document.createElement('div');
        projectEl.className = 'project-item';
        projectEl.dataset.id = project.id;

        const date = new Date(project.updated_at || project.created_at);
        const dateStr = formatThaiDate(date);

        projectEl.innerHTML = `
            <div>
                <div class="project-name">${project.name}</div>
                <div class="project-date">อัปเดต: ${dateStr}</div>
            </div>
            <i class="fas fa-chevron-right"></i>
        `;

        projectEl.addEventListener('click', () => openProject(project));
        elements.projectsList.appendChild(projectEl);
    });
}

async function openProject(project, forceTakeover = false) {
    try {
        showLoading();

        if (currentProject && Number(currentProject.id) !== Number(project.id)) {
            await releaseCurrentLock();
        }

        const lockResult = await acquireLock(project.id, forceTakeover);
        if (!lockResult.ok && lockResult.takeover) {
            hideLoading();
            return openProject(project, true);
        }

        if (!lockResult.ok) {
            hideLoading();
            return;
        }

        currentProject = project;
        activeLockProjectId = Number(project.id);
        startLockHeartbeat();

        document.querySelectorAll('.project-item').forEach((el) => {
            el.classList.remove('active');
            if (Number(el.dataset.id) === Number(project.id)) {
                el.classList.add('active');
            }
        });

        elements.pageTitle.textContent = project.name;
        elements.projectNameDisplay.textContent = project.name;
        elements.projectDescDisplay.textContent = project.description || 'ไม่มีคำอธิบาย';
        elements.projectUpdated.textContent = formatThaiDate(new Date(project.updated_at || project.created_at));
        elements.projectLastEditor.textContent = project.last_updated_by_display_name || project.last_updated_by_email || '-';

        elements.welcomeSection.style.display = 'none';
        elements.projectInfoSection.style.display = 'block';
        elements.editorSection.style.display = 'block';
        elements.saveBtn.style.display = 'flex';

        updateSaveStatus('saved', 'บันทึกแล้ว');
        await loadJSONData(project.id);
    } catch (error) {
        showNotification('error', 'เปิดโปรเจคไม่สำเร็จ', error.message);
    } finally {
        hideLoading();
    }
}

async function acquireLock(projectId, force = false) {
    const result = await apiFetch(`/projects/${projectId}/lock`, {
        method: 'POST',
        body: JSON.stringify({ force })
    });

    if (result.success) {
        return { ok: true };
    }

    if (result.conflict) {
        const takeover = await showLockConflictModal(result.conflict);
        if (takeover) {
            return { ok: false, takeover: true };
        }
        return { ok: false, takeover: false };
    }

    throw new Error(result.error || 'Lock failed');
}

function showLockConflictModal(conflict) {
    return new Promise((resolve) => {
        const lockedAt = conflict.lockedAt ? formatThaiTime(new Date(conflict.lockedAt)) : '-';
        elements.lockMessage.textContent = `โปรเจ็กต์นี้กำลังถูกใช้งานโดย ${conflict.username} (เริ่มล็อกเวลา ${lockedAt})`;
        elements.lockModal.classList.add('active');

        const onCancel = () => {
            cleanup(false);
        };
        const onTakeover = () => {
            cleanup(true);
        };

        function cleanup(result) {
            elements.lockModal.classList.remove('active');
            elements.lockCancelBtn.removeEventListener('click', onCancel);
            elements.lockTakeoverBtn.removeEventListener('click', onTakeover);
            resolve(result);
        }

        elements.lockCancelBtn.addEventListener('click', onCancel);
        elements.lockTakeoverBtn.addEventListener('click', onTakeover);
    });
}

function startLockHeartbeat() {
    stopLockHeartbeat();

    lockHeartbeatInterval = setInterval(async () => {
        if (!activeLockProjectId) {
            return;
        }

        const result = await apiFetch(`/projects/${activeLockProjectId}/lock/heartbeat`, {
            method: 'POST',
            body: JSON.stringify({})
        });

        if (!result.success) {
            showToastNotification('warning', 'เสียสิทธิ์ lock โปรเจ็กต์นี้แล้ว');
            stopLockHeartbeat();
        }
    }, 15000);
}

function stopLockHeartbeat() {
    if (lockHeartbeatInterval) {
        clearInterval(lockHeartbeatInterval);
        lockHeartbeatInterval = null;
    }
}

async function releaseCurrentLock() {
    if (!activeLockProjectId) {
        return;
    }

    try {
        await apiFetch(`/projects/${activeLockProjectId}/lock`, {
            method: 'DELETE',
            body: JSON.stringify({})
        });
    } catch (error) {
        console.error('Release lock error:', error);
    }

    activeLockProjectId = null;
    stopLockHeartbeat();
}

function releaseLockOnUnload() {
    if (!activeLockProjectId || !authToken) {
        return;
    }

    fetch(`${resolvedApiBaseUrl}/projects/${activeLockProjectId}/lock`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        keepalive: true
    });
}

async function loadJSONData(projectId) {
    try {
        const result = await apiFetch(`/json/${projectId}`);

        if (result.success) {
            let jsonData = {};
            if (result.data && result.data.json_data) {
                jsonData = typeof result.data.json_data === 'string'
                    ? JSON.parse(result.data.json_data)
                    : result.data.json_data;

                if (result.data.updated_at) {
                    elements.lastSavedTime.textContent = formatThaiTime(new Date(result.data.updated_at));
                    elements.lastSavedMessage.style.display = 'flex';
                }

                if (result.data.last_updated_by_display_name || result.data.last_updated_by_email) {
                    elements.projectLastEditor.textContent = result.data.last_updated_by_display_name || result.data.last_updated_by_email;
                }
            } else {
                elements.lastSavedMessage.style.display = 'none';
            }

            editor.set(jsonData);
            updateSaveStatus('saved', 'บันทึกแล้ว');
            hasUnsavedChanges = false;
        } else {
            editor.set({});
            updateSaveStatus('unsaved', 'ยังไม่ได้บันทึก');
        }
    } catch (error) {
        showNotification('error', 'ไม่สามารถโหลดข้อมูล JSON ได้', error.message);
    }
}

function showProjectModal(project = null) {
    if (!currentUser || !currentUser.is_admin) {
        showToastNotification('warning', 'เฉพาะ admin เท่านั้นที่สามารถสร้างโปรเจคได้');
        return;
    }

    const modalTitle = document.getElementById('modal-title');
    const projectId = document.getElementById('project-id');
    const projectName = document.getElementById('project-name');
    const projectDesc = document.getElementById('project-description');

    if (project) {
        modalTitle.textContent = 'แก้ไขโปรเจค';
        projectId.value = project.id;
        projectName.value = project.name;
        projectDesc.value = project.description || '';
    } else {
        modalTitle.textContent = 'สร้างโปรเจคใหม่';
        projectId.value = '';
        projectName.value = '';
        projectDesc.value = '';
    }

    elements.projectModal.classList.add('active');
}

function closeModal() {
    elements.projectModal.classList.remove('active');
    elements.projectForm.reset();
}

async function handleProjectSubmit(e) {
    e.preventDefault();

    if (!currentUser || !currentUser.is_admin) {
        showNotification('error', 'ไม่มีสิทธิ์', 'เฉพาะ admin เท่านั้นที่สามารถสร้างโปรเจคได้');
        return;
    }

    const projectId = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value.trim();
    const description = document.getElementById('project-description').value.trim();

    if (!name) {
        showNotification('error', 'กรุณากรอกชื่อโปรเจค', 'ชื่อโปรเจคเป็นฟิลด์ที่จำเป็น');
        return;
    }

    const url = projectId ? `/projects/${projectId}` : '/projects';
    const method = projectId ? 'PUT' : 'POST';

    try {
        showLoading();
        const result = await apiFetch(url, {
            method,
            body: JSON.stringify({ name, description })
        });

        if (result.success) {
            closeModal();
            await loadProjects();

            if (!projectId && result.data) {
                const detail = await apiFetch(`/projects/${result.data.id}`);
                if (detail.success && detail.data) {
                    await openProject(detail.data);
                }
            }

            showToastNotification('success', projectId ? '✓ แก้ไขโปรเจคสำเร็จ' : '✓ สร้างโปรเจคสำเร็จ');
        } else {
            showNotification('error', 'เกิดข้อผิดพลาด', result.error || 'ไม่สามารถบันทึกโปรเจคได้');
        }
    } catch (error) {
        showNotification('error', 'ไม่สามารถบันทึกโปรเจคได้', error.message);
    } finally {
        hideLoading();
    }
}

async function deleteProject() {
    if (!currentUser || !currentUser.is_admin) {
        showNotification('error', 'ไม่มีสิทธิ์', 'เฉพาะ admin เท่านั้นที่สามารถลบโปรเจคได้');
        return;
    }

    if (!currentProject || !confirm('คุณต้องการลบโปรเจคนี้ใช่หรือไม่? การลบจะไม่สามารถย้อนกลับได้')) {
        return;
    }

    try {
        showLoading();
        const result = await apiFetch(`/projects/${currentProject.id}`, { method: 'DELETE' });

        if (result.success) {
            await releaseCurrentLock();
            currentProject = null;
            showWelcomeScreen();
            await loadProjects();
            showToastNotification('success', '✓ ลบโปรเจคสำเร็จ');
        } else {
            showNotification('error', 'ไม่สามารถลบโปรเจคได้', result.error || 'เกิดข้อผิดพลาด');
        }
    } catch (error) {
        showNotification('error', 'เกิดข้อผิดพลาดในการลบ', error.message);
    } finally {
        hideLoading();
    }
}

function showWelcomeScreen() {
    elements.welcomeSection.style.display = 'block';
    elements.projectInfoSection.style.display = 'none';
    elements.editorSection.style.display = 'none';
    elements.pageTitle.textContent = 'JSON Code Generator';
    elements.saveBtn.style.display = 'none';

    document.querySelectorAll('.project-item').forEach((el) => el.classList.remove('active'));
}

function initJSONEditor() {
    const container = document.getElementById('jsoneditor');
    const options = {
        mode: 'tree',
        modes: ['tree', 'code', 'form'],
        onError: () => {
            updateSaveStatus('error', 'JSON ไม่ถูกต้อง');
        },
        onChange: () => {
            hasUnsavedChanges = true;
            updateSaveStatus('unsaved', 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก');
        }
    };

    editor = new JSONEditor(container, options);
    editor.set({
        project: 'โปรเจคใหม่ของคุณ',
        version: '1.0.0',
        description: 'นี่คือ JSON เริ่มต้น',
        data: {
            ตัวอย่าง: 'แก้ไขข้อมูลนี้',
            array: [1, 2, 3],
            boolean: true
        }
    });
}

async function saveJSON() {
    if (!currentProject) {
        showNotification('error', 'กรุณาเลือกโปรเจคก่อนบันทึก', 'โปรดเลือกโปรเจคจากเมนูด้านซ้าย');
        return;
    }

    try {
        updateSaveStatus('saving', 'กำลังบันทึก...');
        const jsonString = JSON.stringify(editor.get(), null, 2);

        const result = await apiFetch('/json/save', {
            method: 'POST',
            body: JSON.stringify({
                projectId: currentProject.id,
                jsonData: jsonString
            })
        });

        if (result.success) {
            hasUnsavedChanges = false;
            updateSaveStatus('saved', 'บันทึกแล้ว');
            elements.lastSavedTime.textContent = formatThaiTime(new Date());
            elements.lastSavedMessage.style.display = 'flex';
            elements.projectLastEditor.textContent = currentUser?.display_name || currentUser?.email || '-';
            elements.projectUpdated.textContent = formatThaiDate(new Date());
            showToastNotification('success', '✓ บันทึก JSON สำเร็จ');
            autoRefreshProjects();
        } else if (result.conflict) {
            showNotification(
                'warning',
                'ไม่สามารถบันทึกได้',
                `โปรเจ็กต์นี้ถูก lock โดย ${result.conflict.username}`
            );
            updateSaveStatus('error', 'บันทึกไม่สำเร็จ');
        } else {
            updateSaveStatus('error', 'บันทึกไม่สำเร็จ');
            showNotification('error', 'ไม่สามารถบันทึก JSON ได้', result.error || 'เกิดข้อผิดพลาด');
        }
    } catch (error) {
        updateSaveStatus('error', 'เกิดข้อผิดพลาด');
        showNotification('error', 'เกิดข้อผิดพลาดในการบันทึก', error.message);
    }
}

function validateJSON() {
    try {
        editor.get();
        showNotification('success', 'JSON ถูกต้อง!', 'โครงสร้าง JSON ถูกต้องตามมาตรฐาน');
        updateSaveStatus('saved', 'JSON ถูกต้อง');
    } catch (error) {
        showNotification('error', 'JSON ไม่ถูกต้อง', error.message);
        updateSaveStatus('error', 'JSON ไม่ถูกต้อง');
    }
}

function formatJSON() {
    try {
        const json = editor.get();
        editor.set(json);
        showNotification('success', 'จัดรูปแบบสำเร็จ', 'JSON ถูกจัดรูปแบบใหม่แล้ว');
    } catch (error) {
        showNotification('error', 'ไม่สามารถจัดรูปแบบได้', error.message);
    }
}

function clearJSON() {
    if (!currentUser || !currentUser.is_admin) {
        showToastNotification('warning', 'เฉพาะ admin เท่านั้นที่สามารถล้าง JSON ได้');
        return;
    }

    if (confirm('คุณต้องการล้าง JSON ทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        editor.set({});
        updateSaveStatus('unsaved', 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก');
        showNotification('warning', 'ล้างข้อมูลแล้ว', 'JSON editor ถูกล้างแล้ว');
    }
}

async function openPermissionModal() {
    if (!currentUser || !currentUser.is_admin) {
        showToastNotification('warning', 'เฉพาะ admin เท่านั้นที่สามารถจัดการสิทธิ์ได้');
        return;
    }

    if (!currentProject) {
        return;
    }

    try {
        showLoading();
        const result = await apiFetch(`/projects/${currentProject.id}/permissions`);
        if (!result.success) {
            showNotification('error', 'ไม่สามารถโหลดสิทธิ์ได้', result.error || 'เกิดข้อผิดพลาด');
            return;
        }

        renderPermissionList(result.data || []);
        elements.permissionModal.classList.add('active');
    } catch (error) {
        showNotification('error', 'ไม่สามารถโหลดสิทธิ์ได้', error.message);
    } finally {
        hideLoading();
    }
}

function closePermissionModal() {
    elements.permissionModal.classList.remove('active');
}

function renderPermissionList(rows) {
    if (!rows.length) {
        elements.permissionList.innerHTML = '<p class="empty-permission">ยังไม่มีผู้ใช้อื่นที่ได้รับสิทธิ์</p>';
        return;
    }

    elements.permissionList.innerHTML = rows.map((row) => {
        const canEditBadge = row.can_edit
            ? '<span class="permission-badge edit">Edit</span>'
            : '<span class="permission-badge view">View</span>';

        return `
            <div class="permission-item">
                <div>
                    <div class="permission-user">${row.display_name} (${row.email || row.username})</div>
                    <div class="permission-meta">${canEditBadge}</div>
                </div>
            </div>
        `;
    }).join('');
}

async function grantPermission(e) {
    e.preventDefault();

    if (!currentProject) {
        return;
    }

    const email = elements.grantEmailInput.value.trim().toLowerCase();
    const canEdit = elements.grantCanEdit.checked;

    if (!email) {
        showToastNotification('warning', 'กรุณาระบุ email');
        return;
    }

    try {
        const result = await apiFetch(`/projects/${currentProject.id}/permissions/grant`, {
            method: 'POST',
            body: JSON.stringify({ email, canEdit })
        });

        if (result.success) {
            showToastNotification('success', 'อัปเดตสิทธิ์สำเร็จ');
            elements.grantEmailInput.value = '';
            elements.grantCanEdit.checked = false;
            await openPermissionModal();
        } else {
            showToastNotification('error', result.error || 'ไม่สามารถอัปเดตสิทธิ์ได้');
        }
    } catch (error) {
        showToastNotification('error', error.message);
    }
}

function updateSaveStatus(status, message) {
    const indicator = elements.saveIndicator;
    indicator.className = 'save-indicator';
    indicator.classList.add(status);
    elements.saveMessage.textContent = message;
    elements.saveStatus.style.opacity = (status === 'saved' && message === 'บันทึกแล้ว') ? '0.7' : '1';
}

function showNotification(type, title, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    notification.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    elements.notificationArea.appendChild(notification);

    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function showToastNotification(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle'
    };

    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function autoRefreshProjects() {
    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'auto-refresh-indicator';
    refreshIndicator.innerHTML = '<i class="fas fa-sync-alt"></i><span>กำลังรีเฟรชรายการโปรเจค...</span>';

    elements.notificationArea.appendChild(refreshIndicator);

    if (autoRefreshTimeout) {
        clearTimeout(autoRefreshTimeout);
    }

    autoRefreshTimeout = setTimeout(async () => {
        await loadProjects();
        refreshIndicator.innerHTML = '<i class="fas fa-check-circle"></i><span>รีเฟรชรายการโปรเจคแล้ว</span>';
        refreshIndicator.style.color = 'var(--success-color)';
        setTimeout(() => refreshIndicator.remove(), 2000);
    }, 1200);
}

function formatThaiDate(date) {
    return date.toLocaleDateString('th-TH', {
        timeZone: THAI_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatThaiTime(date) {
    return date.toLocaleTimeString('th-TH', {
        timeZone: THAI_TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function showLoading() {
    if (document.getElementById('loading-overlay')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}
