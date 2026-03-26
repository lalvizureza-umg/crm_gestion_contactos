/**
 * config.js - Configuración del Frontend
 * Define la URL base del backend API
 */

const CONFIG = {
    API_BASE_URL: 'http://localhost:5000',
    TOKEN_KEY: 'crm_auth_token',
    USER_KEY: 'crm_user'
};

/**
 * Obtiene el token almacenado
 */
function getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
}

/**
 * Guarda el token
 */
function setToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
}

/**
 * Obtiene el usuario almacenado
 */
function getUser() {
    const user = localStorage.getItem(CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
}

/**
 * Guarda el usuario
 */
function setUser(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
}

/**
 * Limpia la sesión
 */
function clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
}

/**
 * Verifica si hay sesión activa
 */
function isAuthenticated() {
    return !!getToken();
}

/**
 * Función para hacer peticiones al API con autenticación
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const token = getToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            clearSession();
            window.location.href = '/login.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('Error en petición API:', error);
        throw error;
    }
}

/**
 * Redirige al login si no está autenticado
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Logout
 */
function logout() {
    clearSession();
    window.location.href = '/login.html';
}
