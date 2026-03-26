/**
 * dashboard.js - Funcionalidad del Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    setCurrentDate();
    loadStats();
    loadCumpleaneros();
});

function setCurrentDate() {
    const el = document.getElementById('current-date');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('es-CO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

async function loadStats() {
    try {
        const res = await apiFetch('/api/dashboard/stats');
        if (!res) return;
        const d = await res.json();
        animateCounter('stat-activos', d.clientes_activos);
        animateCounter('stat-inactivos', d.clientes_inactivos);
        animateCounter('stat-prospectos', d.prospectos);
        animateCounter('stat-proveedores', d.proveedores_activos);
    } catch(e) { 
        console.error('Error cargando estadísticas:', e); 
    }
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
    }, 30);
}

async function loadCumpleaneros() {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesActual = meses[new Date().getMonth()];
    const badge = document.getElementById('birthday-month-badge');
    if (badge) badge.textContent = mesActual;

    const container = document.getElementById('birthday-list');
    try {
        const res = await apiFetch('/api/dashboard/cumpleaneros');
        if (!res) return;
        const data = await res.json();

        if (!data.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎂</div>
                    No hay cumpleaños registrados para este mes.
                </div>`;
            return;
        }

        container.innerHTML = data.map(c => `
            <div class="birthday-item">
                <div class="birthday-day-box">
                    <span class="birthday-day-num">${c.dia}</span>
                    <span class="birthday-day-mon">${mesActual.slice(0,3)}</span>
                </div>
                <div class="birthday-info">
                    <div class="birthday-name">${c.nombre}</div>
                    <div class="birthday-meta">🎈 Cumpleaños este mes</div>
                </div>
                <div class="birthday-age-pill">🎁 ${c.edad} años</div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = '<div class="empty-state">Error cargando información.</div>';
    }
}
