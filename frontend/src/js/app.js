// Configuration
const API_BASE_URL = '/api';
let currentProject = null;
let editor = null;

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
    saveBtn: document.getElementById('save-btn'),
    validateBtn: document.getElementById('validate-btn'),
    formatBtn: document.getElementById('format-btn'),
    clearBtn: document.getElementById('clear-btn'),
    editProjectBtn: document.getElementById('edit-project-btn'),
    deleteProjectBtn: document.getElementById('delete-project-btn'),
    getStartedBtn: document.getElementById('get-started-btn'),
    projectNameDisplay: document.getElementById('project-name-display'),
    projectDescDisplay: document.getElementById('project-desc-display'),
    projectUpdated: document.getElementById('project-updated')
};

// Initialize
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    loadTheme();
    setupEventListeners();
    await loadProjects();
    initJSONEditor();
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

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchEditorMode(mode);
        });
    });
}

// Project Management
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        const result = await response.json();
        
        if (result.success) {
            renderProjects(result.data);
        } else {
            console.error('Failed to load projects:', result.error);
            showError('ไม่สามารถโหลดโปรเจคได้');
        }
    } catch (error) {
        console.error('Network error:', error);
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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
        const dateStr = date.toLocaleDateString('th-TH');
        
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
    elements.projectUpdated.textContent = new Date(project.updated_at || project.created_at).toLocaleDateString('th-TH');
    
    // Show sections
    elements.welcomeSection.style.display = 'none';
    elements.projectInfoSection.style.display = 'block';
    elements.editorSection.style.display = 'block';
    
    // Load JSON data
    await loadJSONData(project.id);
}

async function loadJSONData(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/json/${projectId}`);
        const result = await response.json();
        
        if (result.success) {
            let jsonData = {};
            if (result.data && result.data.json_data) {
                try {
                    jsonData = typeof result.data.json_data === 'string' 
                        ? JSON.parse(result.data.json_data)
                        : result.data.json_data;
                } catch (e) {
                    console.error('Invalid JSON data:', e);
                    jsonData = { error: "Invalid JSON in database" };
                }
            }
            
            if (editor) {
                editor.set(jsonData);
            }
        }
    } catch (error) {
        console.error('Failed to load JSON:', error);
        showError('ไม่สามารถโหลดข้อมูล JSON ได้');
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
        showError('กรุณากรอกชื่อโปรเจค');
        return;
    }
    
    const projectData = { name, description };
    const url = projectId ? `${API_BASE_URL}/projects/${projectId}` : `${API_BASE_URL}/projects`;
    const method = projectId ? 'PUT' : 'POST';
    
    try {
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
            
            showSuccess(projectId ? 'แก้ไขโปรเจคสำเร็จ' : 'สร้างโปรเจคสำเร็จ');
        } else {
            showError(result.error || 'เกิดข้อผิดพลาด');
        }
    } catch (error) {
        console.error('Save project error:', error);
        showError('ไม่สามารถบันทึกโปรเจคได้');
    }
}

async function deleteProject() {
    if (!currentProject || !confirm('คุณต้องการลบโปรเจคนี้ใช่หรือไม่?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject.id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentProject = null;
            showWelcomeScreen();
            await loadProjects();
            showSuccess('ลบโปรเจคสำเร็จ');
        } else {
            showError(result.error || 'ไม่สามารถลบโปรเจคได้');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showError('เกิดข้อผิดพลาดในการลบ');
    }
}

function showWelcomeScreen() {
    elements.welcomeSection.style.display = 'block';
    elements.projectInfoSection.style.display = 'none';
    elements.editorSection.style.display = 'none';
    elements.pageTitle.textContent = 'JSON Code Generator';
    
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
        },
        onModeChange: (newMode, oldMode) => {
            console.log('Mode changed:', oldMode, '->', newMode);
        }
    };
    
    editor = new JSONEditor(container, options);
    editor.set({
        "ชื่อโปรเจค": "โปรเจคใหม่ของคุณ",
        "version": "1.0.0",
        "description": "นี่คือ JSON เริ่มต้น",
        "ข้อมูล": {
            "ตัวอย่าง": "แก้ไขข้อมูลนี้",
            "array": [1, 2, 3],
            "boolean": true
        }
    });
}

function switchEditorMode(mode) {
    if (!editor) return;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) btn.classList.add('active');
    });
    
    // Change editor mode
    editor.setMode(mode);
}

async function saveJSON() {
    if (!currentProject) {
        showError('กรุณาเลือกโปรเจคก่อนบันทึก');
        return;
    }
    
    try {
        const jsonData = editor.get();
        const jsonString = JSON.stringify(jsonData, null, 2);
        
        const response = await fetch(`${API_BASE_URL}/json/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: currentProject.id,
                jsonData: jsonString
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('บันทึก JSON สำเร็จแล้ว');
            await loadProjects(); // Refresh project list for updated time
        } else {
            showError(result.error || 'ไม่สามารถบันทึก JSON ได้');
        }
    } catch (error) {
        console.error('Save error:', error);
        showError('เกิดข้อผิดพลาดในการบันทึก');
    }
}

function validateJSON() {
    try {
        const json = editor.get();
        showSuccess('JSON ถูกต้อง!');
    } catch (error) {
        showError('JSON ไม่ถูกต้อง: ' + error.message);
    }
}

function formatJSON() {
    try {
        const json = editor.get();
        editor.set(json); // This will reformat
        showSuccess('จัดรูปแบบ JSON สำเร็จ');
    } catch (error) {
        showError('ไม่สามารถจัดรูปแบบได้: ' + error.message);
    }
}

function clearJSON() {
    if (confirm('คุณต้องการล้าง JSON ทั้งหมดใช่หรือไม่?')) {
        editor.set({});
    }
}

// Notification
function showSuccess(message) {
    const resultEl = document.getElementById('validation-result');
    resultEl.className = 'validation-result success';
    resultEl.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    setTimeout(() => {
        resultEl.className = 'validation-result';
        resultEl.innerHTML = '';
    }, 3000);
}

function showError(message) {
    const resultEl = document.getElementById('validation-result');
    resultEl.className = 'validation-result error';
    resultEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    setTimeout(() => {
        resultEl.className = 'validation-result';
        resultEl.innerHTML = '';
    }, 5000);
}

// Make functions available globally
window.openProject = openProject;