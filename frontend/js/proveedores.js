// proveedores.js — CRM Ing Software

function showToast(msg, type='success'){
  const c = document.getElementById('toast-container');
  if(!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${{success:'✅',error:'❌',warning:'⚠️'}[type]||'💬'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>t.remove(), 4500);
}

function cerrarModal(id){ document.getElementById(id)?.classList.remove('open'); }
function abrirModal(id){ document.getElementById(id)?.classList.add('open'); }

let pendingInactivarId = null;
let pendingEliminarId = null;

// Headers con autenticación
function getHeaders(includeContentType = true) {
  const headers = {
    'Authorization': `Bearer ${getToken()}`
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/* ═══════════════════════ LISTA ═══════════════════════════════ */
if(document.getElementById('proveedores-tbody')){
  document.addEventListener('DOMContentLoaded', ()=>{
    if (!requireAuth()) return;
    cargarCategoriasFiltro();
    cargar();
  });
}

async function cargarCategoriasFiltro(){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores/categorias`, {
      headers: getHeaders(false)
    });
    const data = await res.json();
    const sel = document.getElementById('search-categoria');
    if(!sel) return;
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    data.forEach(c => {
      const o = document.createElement('option');
      o.value = c.nombre;
      o.textContent = c.nombre;
      sel.appendChild(o);
    });
  }catch(e){ console.error('Error cargando categorías:', e); }
}

async function cargar(page=1){
  const nombre = document.getElementById('search-nombre')?.value.trim() || '';
  const categoria = document.getElementById('search-categoria')?.value || '';
  const tbody = document.getElementById('proveedores-tbody');

  tbody.innerHTML = '<tr><td colspan="6" class="loading-overlay"><div class="spinner"></div></td></tr>';

  try{
    const p = new URLSearchParams({page});
    if(nombre) p.set('nombre', nombre);
    if(categoria) p.set('categoria', categoria);

    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores?${p}`, {
      headers: getHeaders(false)
    });
    const data = await res.json();

    if(data.error){
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:24px;">${data.error}</td></tr>`;
      return;
    }

    renderTabla(data.proveedores || [], data.total || 0, page, data.per_page || 20);
  }catch(e){
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:24px;">Error al conectar con el servidor.</td></tr>';
  }
}

function renderTabla(items, total, page, per_page){
  const tbody = document.getElementById('proveedores-tbody');
  const pag = document.getElementById('paginacion');

  if(!items.length){
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div style="text-align:center;padding:60px 24px;">
            <div style="font-size:3.5rem;margin-bottom:14px;line-height:1;">🏢</div>
            <div style="font-weight:700;font-size:1rem;color:#1e293b;margin-bottom:8px;">
              Sin proveedores registrados
            </div>
            <div style="font-size:.85rem;color:#64748b;">
              Haz clic en <strong>＋ Nuevo Proveedor</strong> para agregar uno.
            </div>
          </div>
        </td>
      </tr>`;
    pag.style.display = 'none';
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr>
      <td><strong>${p.nombre_empresa}</strong></td>
      <td>${p.nit}</td>
      <td><span class="badge badge-cliente">${p.categoria || '—'}</span></td>
      <td>${p.telefono || '—'}</td>
      <td>
        <span class="badge ${p.estado==='Activo' ? 'badge-active' : 'badge-inactive'}">
          ${p.estado}
        </span>
      </td>
      <td class="td-actions">
        <a href="/form_proveedor.html?id=${p.id_proveedor}"
           class="btn btn-ghost btn-sm btn-icon" title="Editar">✏️</a>
        ${p.estado === 'Activo'
          ? `<button class="btn btn-warning btn-sm btn-icon"
               onclick="abrirInactivar(${p.id_proveedor})" title="Inactivar">🚫</button>`
          : `<button class="btn btn-ghost btn-sm btn-icon"
               onclick="activar(${p.id_proveedor})" title="Activar">✅</button>`}
        <button class="btn btn-danger btn-sm btn-icon"
          onclick="abrirEliminar(${p.id_proveedor})" title="Eliminar">🗑️</button>
      </td>
    </tr>`).join('');

  pag.style.display = 'flex';
  const desde = (page-1)*per_page + 1;
  const hasta = Math.min(page*per_page, total);
  document.getElementById('pag-info').textContent = `Mostrando ${desde}–${hasta} de ${total}`;

  const ctrl = document.getElementById('pag-controls');
  ctrl.innerHTML = '';
  const pages = Math.ceil(total / per_page);

  const mkBtn = (label, p, active, disabled) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.textContent = label;
    b.disabled = disabled;
    if(!disabled) b.onclick = () => cargar(p);
    return b;
  };
  ctrl.appendChild(mkBtn('‹', page-1, false, page<=1));
  for(let i = Math.max(1,page-2); i <= Math.min(pages,page+2); i++)
    ctrl.appendChild(mkBtn(i, i, i===page, false));
  ctrl.appendChild(mkBtn('›', page+1, false, page>=pages));
}

function buscar(){ cargar(1); }
function limpiar(){
  document.getElementById('search-nombre').value = '';
  document.getElementById('search-categoria').value = '';
  cargar(1);
}

/* ══════════════ Inactivar ════════════════════════════════════ */
function abrirInactivar(id){
  pendingInactivarId = id;
  document.getElementById('motivo-inactivacion').value = '';
  document.getElementById('motivo-error').style.display = 'none';
  abrirModal('modal-inactivar');
}

async function confirmarInactivar(){
  const motivo = document.getElementById('motivo-inactivacion').value.trim();
  if(!motivo){
    document.getElementById('motivo-error').style.display = 'block';
    return;
  }
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores/${pendingInactivarId}/inactivar`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({motivo})
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    showToast(d.mensaje || 'Proveedor inactivado.', 'success');
    cerrarModal('modal-inactivar');
    cargar(1);
  }catch(e){ showToast('Error al inactivar.', 'error'); }
}

/* ══════════════ Activar ══════════════════════════════════════ */
async function activar(id){
  if(!confirm('¿Activar este proveedor?')) return;
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores/${id}/activar`, {
      method: 'PATCH',
      headers: getHeaders(false)
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    showToast(d.mensaje || 'Proveedor activado.', 'success');
    cargar(1);
  }catch(e){ showToast('Error al activar.', 'error'); }
}

/* ══════════════ Eliminar ═════════════════════════════════════ */
function abrirEliminar(id){ pendingEliminarId = id; abrirModal('modal-eliminar'); }

async function confirmarEliminar(){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores/${pendingEliminarId}`, {
      method: 'DELETE',
      headers: getHeaders(false)
    });
    const d = await res.json();
    cerrarModal('modal-eliminar');
    if(d.error){ showToast(d.error, 'error'); return; }
    showToast(d.mensaje || 'Proveedor eliminado.', 'success');
    cargar(1);
  }catch(e){ showToast('Error al eliminar.', 'error'); }
}

/* ═══════════════════════ FORMULARIO ══════════════════════════ */
if(typeof PROVEEDOR_ID !== 'undefined'){
  document.addEventListener('DOMContentLoaded', async ()=>{
    if (!requireAuth()) return;
    await cargarCategoriasForm();
    if(PROVEEDOR_ID) cargarDatos(PROVEEDOR_ID);
  });
}

async function cargarCategoriasForm(){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores/categorias`, {
      headers: getHeaders(false)
    });
    const data = await res.json();
    const sel = document.getElementById('id_categoria');
    if(!sel) return;
    sel.innerHTML = '<option value="">Seleccione categoría...</option>';
    data.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.nombre;
      sel.appendChild(o);
    });
  }catch(e){ console.error('Error cargando categorías:', e); }
}

async function cargarDatos(id){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores/${id}`, {
      headers: getHeaders(false)
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    document.getElementById('form-title').textContent = 'Editar Proveedor';
    document.getElementById('form-breadcrumb').textContent = 'Editar';
    document.getElementById('nombre_empresa').value = d.nombre_empresa || '';
    document.getElementById('nit').value = d.nit || '';
    document.getElementById('id_categoria').value = d.id_categoria || '';
    document.getElementById('contacto').value = d.contacto || '';
    document.getElementById('telefono').value = d.telefono || '';
    document.getElementById('correo').value = d.correo || '';
    document.getElementById('direccion').value = d.direccion || '';
    document.getElementById('notas').value = d.notas || '';
  }catch(e){ showToast('Error al cargar datos.', 'error'); }
}

async function guardar(){
  const nombre = document.getElementById('nombre_empresa').value.trim();
  const nit = document.getElementById('nit').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const id_cat = document.getElementById('id_categoria').value;
  const isEdit = typeof PROVEEDOR_ID !== 'undefined' && PROVEEDOR_ID;

  if(!nombre){ showToast('El nombre de empresa es obligatorio.', 'error'); return; }
  if(!nit){ showToast('El NIT es obligatorio.', 'error'); return; }
  if(!telefono){ showToast('El teléfono es obligatorio.', 'error'); return; }
  if(!id_cat){ showToast('Selecciona una categoría.', 'error'); return; }

  const payload = {
    nombre_empresa: nombre,
    nit,
    id_categoria: parseInt(id_cat),
    contacto: document.getElementById('contacto').value.trim() || null,
    telefono,
    correo: document.getElementById('correo').value.trim() || null,
    direccion: document.getElementById('direccion').value.trim() || null,
    notas: document.getElementById('notas').value.trim() || null,
  };

  const btn = document.querySelector('.btn-gold');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try{
    const url = isEdit 
      ? `${CONFIG.API_BASE_URL}/api/proveedores/${PROVEEDOR_ID}` 
      : `${CONFIG.API_BASE_URL}/api/proveedores`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if(data.error){
      showToast(data.error, 'error');
      btn.disabled = false;
      btn.textContent = '💾 Guardar';
      return;
    }

    showToast(data.mensaje || (isEdit ? 'Proveedor actualizado.' : 'Proveedor registrado exitosamente.'), 'success');
    setTimeout(()=> window.location.href = '/proveedores.html', 1200);

  }catch(e){
    showToast('Error al guardar.', 'error');
    btn.disabled = false;
    btn.textContent = '💾 Guardar';
  }
}
