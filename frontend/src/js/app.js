// Configuration
const API_BASE_URL = '/api';
let currentProject = null;
let editor = null;
let saveTimeout = null;
let hasUnsavedChanges = false;
let autoRefreshTimeout = null;

// DOM Elements
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
    saveBtn: document.getElementById('save-btn'), // ตำแหน่งใหม่
    validateBtn: document.getElementById('validate-btn'),
    formatBtn: document.getElementById('format-btn'),
    clearBtn: document.getElementById('clear-btn'),
    editProjectBtn: document.getElementById('edit-project-btn'),
    deleteProjectBtn: document.getElementById('delete-project-btn'),
    getStartedBtn: document.getElementById('get-started-btn'),
    projectNameDisplay: document.getElementById('project-name-display'),
    projectDescDisplay: document.getElementById('project-desc-display'),
    projectUpdated: document.getElementById('project-updated'),
    lastSavedMessage: document.getElementById('last-saved-message'),
    lastSavedTime: document.getElementById('last-saved-time'),
    saveIndicator: document.getElementById('save-indicator'),
    saveMessage: document.getElementById('save-message'),
    saveStatus: document.getElementById('save-status'),
    notificationArea: document.getElementById('notification-area')
};

// Initialize
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    loadTheme();
    setupEventListeners();
    await loadProjects();
    initJSONEditor();
    
    // ซ่อนปุ่มบันทึกในหน้าแรก
    elements.saveBtn.style.display = 'none';
}

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.body.className = `${theme}-theme`;
    localStorage.setItem('theme', theme);
    
    const icon = elements.themeToggle.querySelector('i');
    const text = elements.themeToggle.querySelector('span') || elements.themeToggle;
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        if (text.tagName === 'BUTTON') {
            elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i> ธีมสว่าง';
        }
    } else {
        icon.className = 'fas fa-moon';
        if (text.tagName === 'BUTTON') {
            elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i> ธีมมืด';
        }
    }
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // New project button
    elements.newProjectBtn.addEventListener('click', () => showProjectModal());

    // Modal
    elements.closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    elements.projectModal.addEventListener('click', (e) => {
        if (e.target === elements.projectModal) closeModal();
    });

    // Project form
    elements.projectForm.addEventListener('submit', handleProjectSubmit);

    // Navigation buttons
    elements.getStartedBtn.addEventListener('click', () => showProjectModal());
    
    // Editor buttons
    elements.saveBtn.addEventListener('click', saveJSON);
    elements.validateBtn.addEventListener('click', validateJSON);
    elements.formatBtn.addEventListener('click', formatJSON);
    elements.clearBtn.addEventListener('click', clearJSON);
    elements.editProjectBtn.addEventListener('click', () => {
        if (currentProject) showProjectModal(currentProject);
    });
    elements.deleteProjectBtn.addEventListener('click', deleteProject);
}

// Project Management
async function loadProjects() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/projects`);
        const result = await response.json();
        
        if (result.success) {
            renderProjects(result.data);
        } else {
            console.error('Failed to load projects:', result.error);
            showNotification('error', 'ไม่สามารถโหลดโปรเจคได้', result.error);
        }
    } catch (error) {
        console.error('Network error:', error);
        showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', error.message);
    } finally {
        hideLoading();
    }
}

function renderProjects(projects) {
    elements.projectsList.innerHTML = '';
    
    if (projects.length === 0) {
        elements.projectsList.innerHTML = `
            <div class="empty-state">
                <p>ยังไม่มีโปรเจค</p>
            </div>
        `;
        return;
    }
    
    projects.forEach(project => {
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

async function openProject(project) {
    currentProject = project;
    
    // Update UI
    document.querySelectorAll('.project-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.id == project.id) el.classList.add('active');
    });
    
    elements.pageTitle.textContent = project.name;
    elements.projectNameDisplay.textContent = project.name;
    elements.projectDescDisplay.textContent = project.description || 'ไม่มีคำอธิบาย';
    elements.projectUpdated.textContent = formatThaiDate(new Date(project.updated_at || project.created_at));
    
    // Show sections
    elements.welcomeSection.style.display = 'none';
    elements.projectInfoSection.style.display = 'block';
    elements.editorSection.style.display = 'block';
    
    // Show save button
    elements.saveBtn.style.display = 'flex';
    
    // Reset save status
    updateSaveStatus('saved', 'บันทึกแล้ว');
    
    // Load JSON data
    await loadJSONData(project.id);
}

async function loadJSONData(projectId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/json/${projectId}`);
        const result = await response.json();
        
        if (result.success) {
            let jsonData = {};
            if (result.data && result.data.json_data) {
                try {
                    jsonData = typeof result.data.json_data === 'string' 
                        ? JSON.parse(result.data.json_data)
                        : result.data.json_data;
                    
                    // Update last saved time
                    if (result.data.updated_at) {
                        const savedTime = formatThaiTime(new Date(result.data.updated_at));
                        elements.lastSavedTime.textContent = savedTime;
                        elements.lastSavedMessage.style.display = 'flex';
                    }
                } catch (e) {
                    console.error('Invalid JSON data:', e);
                    jsonData = { error: "Invalid JSON in database" };
                    showNotification('warning', 'ข้อมูล JSON ไม่ถูกต้อง', 'กรุณาตรวจสอบข้อมูลใน database');
                }
            }
            
            if (editor) {
                editor.set(jsonData);
                updateSaveStatus('saved', 'บันทึกแล้ว');
            }
        } else {
            // No JSON data yet, set empty
            if (editor) {
                editor.set({});
                updateSaveStatus('unsaved', 'ยังไม่ได้บันทึก');
            }
        }
    } catch (error) {
        console.error('Failed to load JSON:', error);
        showNotification('error', 'ไม่สามารถโหลดข้อมูล JSON ได้', error.message);
    } finally {
        hideLoading();
    }
}

// Project Modal
function showProjectModal(project = null) {
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
    
    const projectId = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value.trim();
    const description = document.getElementById('project-description').value.trim();
    
    if (!name) {
        showNotification('error', 'กรุณากรอกชื่อโปรเจค', 'ชื่อโปรเจคเป็นฟิลด์ที่จำเป็น');
        return;
    }
    
    const projectData = { name, description };
    const url = projectId ? `${API_BASE_URL}/projects/${projectId}` : `${API_BASE_URL}/projects`;
    const method = projectId ? 'PUT' : 'POST';
    
    try {
        showLoading();
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal();
            await loadProjects();
            
            // If new project, open it
            if (!projectId && result.data) {
                openProject(result.data);
            }
            
            showNotification('success', 
                projectId ? 'แก้ไขโปรเจคสำเร็จ' : 'สร้างโปรเจคสำเร็จ', 
                projectId ? 'โปรเจคถูกอัปเดตแล้ว' : 'โปรเจคใหม่ถูกสร้างแล้ว'
            );
            
            // Show toast notification
            showToastNotification('success', 
                projectId ? '✓ แก้ไขโปรเจคสำเร็จ' : '✓ สร้างโปรเจคสำเร็จ'
            );
        } else {
            showNotification('error', 'เกิดข้อผิดพลาด', result.error || 'ไม่สามารถบันทึกโปรเจคได้');
        }
    } catch (error) {
        console.error('Save project error:', error);
        showNotification('error', 'ไม่สามารถบันทึกโปรเจคได้', error.message);
    } finally {
        hideLoading();
    }
}

async function deleteProject() {
    if (!currentProject || !confirm('คุณต้องการลบโปรเจคนี้ใช่หรือไม่? การลบจะไม่สามารถย้อนกลับได้')) return;
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject.id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentProject = null;
            showWelcomeScreen();
            await loadProjects();
            
            showNotification('success', 'ลบโปรเจคสำเร็จ', 'โปรเจคถูกลบออกจากระบบแล้ว');
            showToastNotification('success', '✓ ลบโปรเจคสำเร็จ');
        } else {
            showNotification('error', 'ไม่สามารถลบโปรเจคได้', result.error);
        }
    } catch (error) {
        console.error('Delete error:', error);
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
    
    // ซ่อนปุ่มบันทึก
    elements.saveBtn.style.display = 'none';
    
    document.querySelectorAll('.project-item').forEach(el => {
        el.classList.remove('active');
    });
}

// JSON Editor
function initJSONEditor() {
    const container = document.getElementById('jsoneditor');
    const options = {
        mode: 'tree',
        modes: ['tree', 'code', 'form'],
        onError: (err) => {
            console.error('JSONEditor error:', err);
            updateSaveStatus('error', 'JSON ไม่ถูกต้อง');
        },
        onChange: () => {
            // เมื่อมีการเปลี่ยนแปลงใน editor
            hasUnsavedChanges = true;
            updateSaveStatus('unsaved', 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก');
        },
        onModeChange: (newMode, oldMode) => {
            console.log('Mode changed:', oldMode, '->', newMode);
        }
    };
    
    editor = new JSONEditor(container, options);
    editor.set({
        "project": "โปรเจคใหม่ของคุณ",
        "version": "1.0.0",
        "description": "นี่คือ JSON เริ่มต้น",
        "data": {
            "ตัวอย่าง": "แก้ไขข้อมูลนี้",
            "array": [1, 2, 3],
            "boolean": true
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
        
        const jsonData = editor.get();
        const jsonString = JSON.stringify(jsonData, null, 2);
        
        console.log('📤 Saving JSON for project:', currentProject.id);
        
        const response = await fetch(`${API_BASE_URL}/json/save`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                projectId: currentProject.id,
                jsonData: jsonString
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // อัปเดตสถานะ
            hasUnsavedChanges = false;
            updateSaveStatus('saved', 'บันทึกแล้ว');
            
            // อัปเดตเวลาบันทึกล่าสุด
            const now = new Date();
            elements.lastSavedTime.textContent = formatThaiTime(now);
            elements.lastSavedMessage.style.display = 'flex';
            
            // แสดง notification
            showNotification('success', 'บันทึก JSON สำเร็จ', 'ข้อมูลถูกบันทึกลงในฐานข้อมูลแล้ว');
            
            // แสดง toast notification
            showToastNotification('success', '✓ บันทึก JSON สำเร็จ');
            
            // Auto refresh โปรเจคลิสต์หลังจากบันทึก
            autoRefreshProjects();
            
        } else {
            updateSaveStatus('error', 'บันทึกไม่สำเร็จ');
            showNotification('error', 'ไม่สามารถบันทึก JSON ได้', result.error);
        }
    } catch (error) {
        console.error('❌ Save error:', error);
        updateSaveStatus('error', 'เกิดข้อผิดพลาด');
        showNotification('error', 'เกิดข้อผิดพลาดในการบันทึก', error.message);
    }
}

function validateJSON() {
    try {
        const json = editor.get();
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
        editor.set(json); // This will reformat
        showNotification('success', 'จัดรูปแบบสำเร็จ', 'JSON ถูกจัดรูปแบบใหม่แล้ว');
    } catch (error) {
        showNotification('error', 'ไม่สามารถจัดรูปแบบได้', error.message);
    }
}

function clearJSON() {
    if (confirm('คุณต้องการล้าง JSON ทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        editor.set({});
        updateSaveStatus('unsaved', 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก');
        showNotification('warning', 'ล้างข้อมูลแล้ว', 'JSON editor ถูกล้างแล้ว');
    }
}

// Save Status Management
function updateSaveStatus(status, message) {
    const indicator = elements.saveIndicator;
    const msgElement = elements.saveMessage;
    
    // ลบ class ก่อนหน้า
    indicator.className = 'save-indicator';
    indicator.classList.add(status);
    
    // อัปเดตข้อความ
    msgElement.textContent = message;
    
    // แสดง/ซ่อน status container
    if (status === 'saved' && message === 'บันทึกแล้ว') {
        elements.saveStatus.style.opacity = '0.7';
    } else {
        elements.saveStatus.style.opacity = '1';
    }
}

// Notification System
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
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
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
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// Auto Refresh Projects after save
function autoRefreshProjects() {
    // แสดง indicator
    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'auto-refresh-indicator';
    refreshIndicator.innerHTML = `
        <i class="fas fa-sync-alt"></i>
        <span>กำลังรีเฟรชรายการโปรเจค...</span>
    `;
    
    elements.notificationArea.appendChild(refreshIndicator);
    
    // รอ 1.5 วินาทีแล้วโหลดใหม่
    if (autoRefreshTimeout) clearTimeout(autoRefreshTimeout);
    
    autoRefreshTimeout = setTimeout(async () => {
        await loadProjects();
        refreshIndicator.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>รีเฟรชรายการโปรเจคแล้ว</span>
        `;
        refreshIndicator.style.color = 'var(--success-color)';
        
        setTimeout(() => refreshIndicator.remove(), 2000);
    }, 1500);
}

// Utility Functions
function formatThaiDate(date) {
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatThaiTime(date) {
    return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Loading Overlay
function showLoading() {
    if (!document.getElementById('loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(overlay);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Make functions available globally
window.openProject = openProject;