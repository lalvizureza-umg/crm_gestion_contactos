/**
 * sidebar.js - Genera el sidebar dinámicamente
 */

function renderSidebar() {
    const user = getUser() || { nombre: 'Usuario', rol: 'usuario' };
    const currentPath = window.location.pathname;
    
    const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">⚙️</div>
          <div class="logo-text">CRM Ing Software<span>Gestión Empresarial</span></div>
        </div>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${user.nombre ? user.nombre[0].toUpperCase() : 'A'}</div>
          <div>
            <div class="sidebar-user-name">${user.nombre || 'Administrador'}</div>
            <div class="sidebar-user-role">${user.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : 'Usuario'}</div>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-title">Principal</div>
        <a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard') ? 'active' : ''}"><span class="nav-icon">📊</span> Dashboard</a>
        <div class="nav-section-title">Módulos</div>
        <a href="/clientes.html" class="nav-link ${currentPath.includes('clientes') ? 'active' : ''}"><span class="nav-icon">👥</span> Clientes</a>
        <a href="/proveedores.html" class="nav-link ${currentPath.includes('proveedores') ? 'active' : ''}"><span class="nav-icon">🏢</span> Proveedores</a>
        <a href="/compras.html" class="nav-link ${currentPath.includes('compras') ? 'active' : ''}"><span class="nav-icon">🛒</span> Compras</a>
        <a href="/empleados.html" class="nav-link ${currentPath.includes('empleados') ? 'active' : ''}"><span class="nav-icon">👔</span> Empleados</a>
      </nav>
      <div class="sidebar-footer">
        <span class="sidebar-version">v2.0.0</span>
        <button class="logout-btn" onclick="logout()">⏻ Salir</button>
      </div>
    </aside>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
}

// Renderizar sidebar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    renderSidebar();
});
