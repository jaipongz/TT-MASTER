const API_BASE_CANDIDATES = [
    '/api',
    `${window.location.protocol}//${window.location.hostname}:3090/api`,
    `${window.location.protocol}//${window.location.hostname}:3000/api`
];

let resolvedApiBaseUrl = localStorage.getItem('api_base_url') || API_BASE_CANDIDATES[0];

const loginForm = document.getElementById('login-form');

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        return;
    }

    try {
        const result = await loginApiFetch('/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (result && result.success) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
});

async function loginApiFetch(path, options = {}) {
    const candidates = [resolvedApiBaseUrl, ...API_BASE_CANDIDATES].filter(
        (value, index, arr) => value && arr.indexOf(value) === index
    );

    let lastError = null;

    for (const baseUrl of candidates) {
        try {
            const response = await fetch(`${baseUrl}${path}`, options);
            const contentType = response.headers.get('content-type') || '';
            const result = contentType.includes('application/json')
                ? await response.json()
                : { success: false, error: `Unexpected response (${response.status})` };

            if (response.status === 404) {
                throw new Error(`API not found at ${baseUrl}`);
            }

            resolvedApiBaseUrl = baseUrl;
            localStorage.setItem('api_base_url', baseUrl);
            return result;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('API connection failed');
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('กรุณากรอก email และ password');
        return;
    }

    try {
        const result = await loginApiFetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!result.success) {
            alert(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
            return;
        }

        localStorage.setItem('auth_token', result.data.token);
        window.location.href = '/';
    } catch (error) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
});
