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

/* ── FORM PAGE ─────────────────────────────────────────── */
let tiposContacto = [];
let contactoIndex = 0;
let activeTab = 'datos';

if (typeof CLIENTE_ID !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (!requireAuth()) return;
        await cargarTiposCliente();
        await cargarTiposContacto();
        if (CLIENTE_ID) {
            cargarDatosCliente(CLIENTE_ID);
        }
        actualizarVistaContactos();
    });
}

function cambiarTab(tabId) {
    activeTab = tabId;
    
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
}

function limpiarErrores() {
    document.querySelectorAll('.error-msg').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
    });
}

function mostrarError(elementId, mensaje) {
    const errorEl = document.getElementById(`error-${elementId}`);
    const inputEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = mensaje;
        errorEl.style.display = 'block';
    }
    if (inputEl) {
        inputEl.classList.add('input-error');
    }
}

async function cargarTiposCliente() {
    try {
        const res = await apiFetch('/api/clientes/tipos-cliente');
        if (!res) return;
        const data = await res.json();
        const sel = document.getElementById('tipo');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccione tipo...</option>';
        data.forEach(t => {
            const o = document.createElement('option');
            o.value = t.descripcion;
            o.textContent = t.descripcion;
            sel.appendChild(o);
        });
        sel.value = 'Cliente';
    } catch (e) {
        console.error('Error cargando tipos de cliente:', e);
    }
}

async function cargarTiposContacto() {
    try {
        const res = await apiFetch('/api/clientes/tipos-contacto');
        if (!res) return;
        tiposContacto = await res.json();
    } catch (e) {
        console.error('Error cargando tipos de contacto:', e);
        tiposContacto = [
            { id: 1, descripcion: 'Teléfono' },
            { id: 2, descripcion: 'Celular' },
            { id: 3, descripcion: 'Email' },
            { id: 4, descripcion: 'Dirección' },
            { id: 5, descripcion: 'Fax' }
        ];
    }
}

async function cargarDatosCliente(id) {
    try {
        const res = await apiFetch(`/api/clientes/${id}`);
        if (!res) return;
        const d = await res.json();
        
        if (d.error) {
            showToast(d.error, 'error');
            return;
        }
        
        document.getElementById('form-title').textContent = 'Editar Cliente';
        document.getElementById('form-breadcrumb').textContent = 'Editar';
        
        document.getElementById('nombre_razon_social').value = d.nombre_razon_social || '';
        document.getElementById('documento_identificacion').value = d.documento_identificacion || '';
        document.getElementById('tipo').value = d.tipo || 'Cliente';
        document.getElementById('fecha_nacimiento').value = d.fecha_nacimiento ? d.fecha_nacimiento.split('T')[0] : '';
        
        if (d.contactos && d.contactos.length > 0) {
            d.contactos.forEach(c => {
                agregarContacto(c);
            });
        }
        actualizarVistaContactos();
    } catch (e) {
        showToast('Error al cargar datos del cliente.', 'error');
        console.error(e);
    }
}

function agregarContacto(contactoData = null) {
    const container = document.getElementById('contactos-container');
    const idx = contactoIndex++;
    
    const tipoOptions = tiposContacto.map(t => {
        const isSelected = contactoData && (contactoData.tipo_contacto === t.descripcion || contactoData.id_tipo_contacto == t.id);
        return `<option value="${t.descripcion}" ${isSelected ? 'selected' : ''}>${t.descripcion}</option>`;
    }).join('');
    
    const div = document.createElement('div');
    div.className = 'contacto-card';
    div.id = `contacto-${idx}`;
    div.innerHTML = `
        <input type="hidden" name="contacto_id_${idx}" value="${contactoData?.id_contacto || ''}">
        <div class="form-group">
            <label style="font-size:0.75rem;font-weight:500;color:var(--text2);">Tipo Contacto</label>
            <select name="contacto_tipo_${idx}" id="contacto_tipo_${idx}">
                <option value="">Seleccione tipo</option>
                ${tipoOptions}
            </select>
            <div id="error-contacto_tipo_${idx}" class="error-msg" style="display:none;"></div>
        </div>
        <div class="form-group">
            <label style="font-size:0.75rem;font-weight:500;color:var(--text2);">Descripción</label>
            <input type="text" name="contacto_desc_${idx}" id="contacto_desc_${idx}" placeholder="Ingrese el valor" value="${contactoData?.descripcion || ''}">
            <div id="error-contacto_desc_${idx}" class="error-msg" style="display:none;"></div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm btn-icon btn-remove" onclick="eliminarContacto(${idx})" title="Eliminar">🗑️</button>
    `;
    container.appendChild(div);
    actualizarVistaContactos();
}

function eliminarContacto(idx) {
    const el = document.getElementById(`contacto-${idx}`);
    if (el) el.remove();
    actualizarVistaContactos();
}

function actualizarVistaContactos() {
    const container = document.getElementById('contactos-container');
    const empty = document.getElementById('contactos-empty');
    if (!container || !empty) return;
    
    const tieneContactos = container.children.length > 0;
    empty.style.display = tieneContactos ? 'none' : 'block';
}

function obtenerContactos() {
    const contactos = [];
    const container = document.getElementById('contactos-container');
    if (!container) return contactos;
    
    const items = container.querySelectorAll('.contacto-item');
    items.forEach(item => {
        const idInput = item.querySelector('input[name^="contacto_id_"]');
        const tipoSelect = item.querySelector('select[name^="contacto_tipo_"]');
        const descInput = item.querySelector('input[name^="contacto_desc_"]');
        
        if (tipoSelect && descInput && descInput.value.trim()) {
            contactos.push({
                id_contacto: idInput?.value ? parseInt(idInput.value) : null,
                tipo_contacto: tipoSelect.value || 'Teléfono',
                descripcion: descInput.value.trim()
            });
        }
    });
    return contactos;
}

function validarFormulario() {
    limpiarErrores();
    let isValid = true;
    let tieneErroresContactos = false;
    
    const nombre = document.getElementById('nombre_razon_social').value.trim();
    const documento = document.getElementById('documento_identificacion').value.trim();
    const tipo = document.getElementById('tipo').value;
    
    if (!nombre) {
        mostrarError('nombre_razon_social', 'El Nombre o Razón Social es obligatorio');
        isValid = false;
    }
    
    if (!documento) {
        mostrarError('documento_identificacion', 'El Documento de Identificación es obligatorio');
        isValid = false;
    }
    
    if (!tipo) {
        mostrarError('tipo', 'El Tipo es obligatorio');
        isValid = false;
    }
    
    const container = document.getElementById('contactos-container');
    const items = container.querySelectorAll('.contacto-card');
    items.forEach((item, index) => {
        const tipoSelect = item.querySelector('select[name^="contacto_tipo_"]');
        const descInput = item.querySelector('input[name^="contacto_desc_"]');
        const tipoId = tipoSelect?.id;
        const descId = descInput?.id;
        
        if (tipoSelect && !tipoSelect.value) {
            const errorEl = document.getElementById(`error-${tipoId}`);
            if (errorEl) {
                errorEl.textContent = 'Seleccione un tipo de contacto';
                errorEl.style.display = 'block';
            }
            tipoSelect.classList.add('input-error');
            isValid = false;
            tieneErroresContactos = true;
        }
        
        if (descInput && !descInput.value.trim()) {
            const errorEl = document.getElementById(`error-${descId}`);
            if (errorEl) {
                errorEl.textContent = 'Ingrese la descripción';
                errorEl.style.display = 'block';
            }
            descInput.classList.add('input-error');
            isValid = false;
            tieneErroresContactos = true;
        }
    });
    
    if (!isValid && tieneErroresContactos && activeTab !== 'contactos') {
        cambiarTab('contactos');
    } else if (!isValid && !tieneErroresContactos && activeTab !== 'datos') {
        cambiarTab('datos');
    }
    
    return isValid;
}

async function guardarCliente() {
    if (!validarFormulario()) {
        return;
    }
    
    const nombre = document.getElementById('nombre_razon_social').value.trim();
    const documento = document.getElementById('documento_identificacion').value.trim();
    const tipo = document.getElementById('tipo').value;
    
    const payload = {
        nombre_razon_social: nombre,
        documento_identificacion: documento,
        tipo: tipo,
        fecha_nacimiento: document.getElementById('fecha_nacimiento').value || null,
        contactos: obtenerContactos()
    };
    
    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    
    try {
        const isEdit = CLIENTE_ID !== null;
        const url = isEdit ? `/api/clientes/${CLIENTE_ID}` : '/api/clientes';
        const method = isEdit ? 'PUT' : 'POST';
        
        const res = await apiFetch(url, {
            method: method,
            body: JSON.stringify(payload)
        });
        
        if (!res) return;
        const data = await res.json();
        
        if (data.error) {
            showToast(data.error, 'error');
            btn.disabled = false;
            btn.textContent = '💾 Guardar';
            return;
        }
        
        showToast(data.mensaje || (isEdit ? 'Cliente actualizado.' : 'Cliente registrado exitosamente.'), 'success');
        setTimeout(() => window.location.href = '/clientes.html', 1200);
        
    } catch (e) {
        showToast('Error al guardar el cliente.', 'error');
        btn.disabled = false;
        btn.textContent = '💾 Guardar';
        console.error(e);
    }
}
