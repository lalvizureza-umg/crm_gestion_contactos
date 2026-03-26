/**
 * clientes.js - Gestión de Clientes
 */

/* ── Shared utilities ─────────────────────────────────── */
function showToast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('open');
}

function abrirModal(id) {
    document.getElementById(id).classList.add('open');
}

/* ── LIST PAGE ────────────────────────────────────────── */
let currentPage = 1;
let pendingInactivarId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (document.getElementById('clientes-tbody')) {
        cargarClientes();
    }
});

async function cargarClientes(page = 1) {
    currentPage = page;
    const nombre    = document.getElementById('search-nombre')?.value || '';
    const documento = document.getElementById('search-documento')?.value || '';
    const tipo      = document.getElementById('search-tipo')?.value || '';

    const params = new URLSearchParams({ nombre, documento, tipo, page });
    const tbody = document.getElementById('clientes-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-overlay"><div class="spinner"></div></td></tr>';

    try {
        const res = await apiFetch(`/api/clientes?${params}`);
        if (!res) return;
        const data = await res.json();
        renderTablaClientes(data);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger)">Error al cargar datos.</td></tr>';
    }
}

function renderTablaClientes(data) {
    const tbody = document.getElementById('clientes-tbody');
    const { clientes, total, page, per_page } = data;

    if (!clientes || !clientes.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="padding:32px;">
            <div class="empty-state-icon">👥</div>
            No se encontraron clientes con los criterios de búsqueda.
        </td></tr>`;
        document.getElementById('pagination-clientes').style.display = 'none';
        return;
    }

    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td><strong>${c.nombre_razon_social}</strong></td>
            <td>${c.documento_identificacion}</td>
            <td><span class="badge badge-${c.tipo === 'Cliente' ? 'cliente' : 'prospecto'}">${c.tipo}</span></td>
            <td><span class="badge badge-${c.estado === 'Activo' ? 'active' : 'inactive'}">${c.estado}</span></td>
            <td>
                <div class="td-actions">
                    <a href="/form_cliente.html?id=${c.id_cliente}" class="btn btn-ghost btn-sm btn-icon" title="Editar">✏️</a>
                    ${c.estado === 'Activo'
                        ? `<button class="btn btn-danger btn-sm btn-icon" onclick="inactivarCliente(${c.id_cliente})" title="Inactivar">🚫</button>`
                        : `<span style="font-size:0.75rem;color:var(--text2)">Inactivo</span>`
                    }
                </div>
            </td>
        </tr>
    `).join('');

    renderPaginacion(total, page, per_page, 'pagination-clientes', 'pag-info', 'pag-controls', cargarClientes);
}

function renderPaginacion(total, page, per_page, wrapId, infoId, ctrlId, fn) {
    const totalPages = Math.ceil(total / per_page);
    const wrap = document.getElementById(wrapId);
    wrap.style.display = 'flex';

    const desde = (page - 1) * per_page + 1;
    const hasta = Math.min(page * per_page, total);
    document.getElementById(infoId).textContent = `Mostrando ${desde}–${hasta} de ${total} registros`;

    const ctrl = document.getElementById(ctrlId);
    ctrl.innerHTML = '';

    const addBtn = (label, pg, disabled = false, active = false) => {
        const b = document.createElement('button');
        b.className = `page-btn${active ? ' active' : ''}`;
        b.innerHTML = label;
        b.disabled = disabled;
        if (!disabled) b.onclick = () => fn(pg);
        ctrl.appendChild(b);
    };

    addBtn('‹', page - 1, page === 1);
    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) addBtn(i, i, false, i === page);
    addBtn('›', page + 1, page === totalPages);
}

function buscarClientes() { cargarClientes(1); }

function limpiarBusqueda() {
    document.getElementById('search-nombre').value = '';
    document.getElementById('search-documento').value = '';
    document.getElementById('search-tipo').value = '';
    cargarClientes(1);
}

function inactivarCliente(id) {
    pendingInactivarId = id;
    abrirModal('modal-inactivar');
}

async function confirmarInactivar() {
    if (!pendingInactivarId) return;
    try {
        const res = await apiFetch(`/api/clientes/${pendingInactivarId}/inactivar`, { method: 'PATCH' });
        if (!res) return;
        const data = await res.json();
        showToast(data.mensaje || 'Cliente inactivado.', 'success');
        cerrarModal('modal-inactivar');
        cargarClientes(currentPage);
    } catch (e) {
        showToast('Error al inactivar el cliente.', 'error');
    }
    pendingInactivarId = null;
}
