// compras.js — CRM Ing Software

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

function getHeaders(includeContentType = true) {
  const headers = { 'Authorization': `Bearer ${getToken()}` };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

const isLista = !!document.getElementById('tbody');
const isForm = !!document.getElementById('id_proveedor') && !document.getElementById('tbody');

if(isLista) {
  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    cargarStats();
    cargar();
  });
}

async function cargarStats(){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/dashboard/stats`, {
      headers: getHeaders(false)
    });
    const d = await res.json();
    document.getElementById('st-total').textContent = d.total_compras || 0;
    document.getElementById('st-monto').textContent = 'Q' + parseFloat(d.monto_total || 0).toLocaleString();
    document.getElementById('st-pend').textContent = d.pendientes || 0;
    document.getElementById('st-pag').textContent = d.pagadas || 0;
  }catch(e){ console.error('Error cargando stats:', e); }
}

async function cargar(page=1){
  const prov = document.getElementById('search-proveedor')?.value || '';
  const est = document.getElementById('search-estado')?.value || '';
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-overlay"><div class="spinner"></div></td></tr>';
  
  try{
    const p = new URLSearchParams({page});
    if(prov) p.set('proveedor', prov);
    if(est) p.set('estado_pago', est);
    
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/compras?${p}`, {
      headers: getHeaders(false)
    });
    const d = await res.json();
    renderTabla(d.compras || [], d.total || 0, page, d.per_page || 10);
  }catch(e){
    tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--danger);">Error al cargar.</td></tr>';
  }
}

let pendingEstadoId = null;

function renderTabla(items, total, page, per_page){
  const tbody = document.getElementById('tbody');
  if(!items.length){
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🛒</div><p>No hay compras registradas.</p></div></td></tr>';
    document.getElementById('paginacion').style.display = 'none';
    return;
  }
  
  tbody.innerHTML = items.map(c => `
    <tr>
      <td>${c.fecha_compra || '—'}</td>
      <td><strong>${c.proveedor}</strong></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${c.productos}</td>
      <td>Q${parseFloat(c.monto_total).toLocaleString()}</td>
      <td>
        <span class="badge ${c.estado_pago==='Pagado' ? 'badge-active' : c.estado_pago==='Cancelado' ? 'badge-inactive' : 'badge-prospecto'}">
          ${c.estado_pago}
        </span>
      </td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" onclick="abrirEstado(${c.id_compra},'${c.estado_pago}')">🔄 Estado</button>
      </td>
    </tr>`).join('');
  
  const pag = document.getElementById('paginacion');
  pag.style.display = 'flex';
  const desde = (page-1)*per_page + 1;
  const hasta = Math.min(page*per_page, total);
  document.getElementById('pag-info').textContent = `Mostrando ${desde}–${hasta} de ${total}`;
  
  const ctrl = document.getElementById('pag-controls');
  ctrl.innerHTML = '';
  const pages = Math.ceil(total / per_page);
  
  const btn = (label, p, active, disabled) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.textContent = label;
    b.disabled = disabled;
    if(!disabled) b.onclick = () => cargar(p);
    return b;
  };
  
  ctrl.appendChild(btn('‹', page-1, false, page<=1));
  for(let i = Math.max(1, page-2); i <= Math.min(pages, page+2); i++)
    ctrl.appendChild(btn(i, i, i===page, false));
  ctrl.appendChild(btn('›', page+1, false, page>=pages));
}

function buscar(){ cargar(1); }
function limpiar(){
  document.getElementById('search-proveedor').value = '';
  document.getElementById('search-estado').value = '';
  cargar(1);
}

function abrirEstado(id, actual){
  pendingEstadoId = id;
  document.getElementById('nuevo-estado').value = actual;
  abrirModal('modal-estado');
}

async function confirmarEstado(){
  const est = document.getElementById('nuevo-estado').value;
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/compras/${pendingEstadoId}/estado`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({estado_pago: est})
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    showToast(d.mensaje || 'Estado actualizado.', 'success');
    cerrarModal('modal-estado');
    cargar(1);
  }catch(e){ showToast('Error.', 'error'); }
}

/* ═══════════════════════ FORMULARIO ══════════════════════════ */
if(isForm){
  document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    try{
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/proveedores?per_page=100`, {
        headers: getHeaders(false)
      });
      const d = await res.json();
      const sel = document.getElementById('id_proveedor');
      sel.innerHTML = '<option value="">Seleccione proveedor...</option>';
      (d.proveedores || []).forEach(p => {
        const o = document.createElement('option');
        o.value = p.id_proveedor;
        o.textContent = p.nombre_empresa;
        sel.appendChild(o);
      });
    }catch(e){ console.error('Error cargando proveedores:', e); }
  });
}

async function guardar(){
  const id_prov = document.getElementById('id_proveedor')?.value;
  const prods = document.getElementById('productos')?.value.trim();
  const monto = document.getElementById('monto_total')?.value;
  const estado = document.getElementById('estado_pago')?.value || 'Pendiente';
  
  if(!id_prov){ showToast('Selecciona un proveedor.', 'error'); return; }
  if(!prods){ showToast('Describe los productos.', 'error'); return; }
  if(!monto || parseFloat(monto) <= 0){ showToast('El monto debe ser mayor a 0.', 'error'); return; }
  
  const payload = {
    id_proveedor: parseInt(id_prov),
    productos: prods,
    monto_total: parseFloat(monto),
    estado_pago: estado,
    fecha_compra: document.getElementById('fecha_compra')?.value || null,
    notas: document.getElementById('notas')?.value.trim() || null,
  };
  
  const btn = document.querySelector('.btn-gold');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/compras`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.error){
      showToast(data.error, 'error');
      btn.disabled = false;
      btn.textContent = '💾 Registrar Compra';
      return;
    }
    showToast(data.mensaje || 'Compra registrada.', 'success');
    setTimeout(() => window.location.href = '/compras.html', 1200);
  }catch(e){
    showToast('Error.', 'error');
    btn.disabled = false;
    btn.textContent = '💾 Registrar Compra';
  }
}
