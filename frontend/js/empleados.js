// empleados.js — CRM Ing Software


function cerrarModal(id){ document.getElementById(id)?.classList.remove('open'); }
function abrirModal(id){ document.getElementById(id)?.classList.add('open'); }

function getHeaders(includeContentType = true) {
  const headers = { 'Authorization': `Bearer ${getToken()}` };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

/* ═══════════════════════════ LISTA ═══════════════════════════ */
if(document.getElementById('tbody') && !document.getElementById('id_dependencia')){
  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    cargarDeps();
    cargar();
  });
}

async function cargarDeps(){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/dependencias`, {
      headers: getHeaders(false)
    });
    const data = await res.json();
    const sel = document.getElementById('search-dependencia');
    if(!sel) return;
    sel.innerHTML = '<option value="">Todas las dependencias</option>';
    data.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id_dependencia;
      o.textContent = d.nombre_dependencia;
      sel.appendChild(o);
    });
  }catch(e){ console.error('Error cargando dependencias:', e); }
}

async function cargar(page=1){
  const nombre = document.getElementById('search-nombre')?.value || '';
  const dep = document.getElementById('search-dependencia')?.value || '';
  const estado = document.getElementById('search-estado')?.value || '';
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '<tr><td colspan="10" class="loading-overlay"><div class="spinner"></div></td></tr>';
  
  try{
    const p = new URLSearchParams({page});
    if(nombre) p.set('nombre', nombre);
    if(dep) p.set('dependencia', dep);
    if(estado) p.set('estado', estado);
    
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/empleados?${p}`, {
      headers: getHeaders(false)
    });
    const d = await res.json();
    renderTabla(d.empleados || [], d.total || 0, page, d.per_page || 10);
  }catch(e){
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--danger);padding:20px;">Error al cargar.</td></tr>';
  }
}

function calcularDiasCumpleanosListado(fechaNacimiento) {
  if (!fechaNacimiento) return '—';

  const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
  if (isNaN(nacimiento.getTime())) return '—';

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let proximo = new Date(
    hoy.getFullYear(),
    nacimiento.getMonth(),
    nacimiento.getDate()
  );

  if (proximo < hoy) {
    proximo.setFullYear(hoy.getFullYear() + 1);
  }

  const msDia = 1000 * 60 * 60 * 24;
  const dias = Math.ceil((proximo - hoy) / msDia);

  if (dias === 0) return 'Hoy 🎂';
  if (dias === 1) return '1 día';
  return `${dias} días`;
}

function renderTabla(items, total, page, per_page){
  const tbody = document.getElementById('tbody');

  if(!items.length){
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">👔</div><p>No se encontraron empleados.</p></div></td></tr>';
    document.getElementById('paginacion').style.display = 'none';
    return;
  }

  tbody.innerHTML = items.map(e => {
    const diasCumple = calcularDiasCumpleanosListado(e.fecha_nacimiento);

    return `
      <tr>
        <td><strong>${escapeHtml(e.numero_empleado || "")}</strong></td>
        <td><strong>${escapeHtml(e.nombre_completo || "—")}</strong></td>
        <td>${escapeHtml(e.cargo || '—')}</td>
        <td>${escapeHtml(e.dependencia || 'Sin asignar')}</td>
        <td>${escapeHtml(e.supervisor || '—')}</td>
        <td>${escapeHtml(e.manager || '—')}</td>
        <td>${escapeHtml(diasCumple)}</td>
        <td><span class="badge ${e.estado==='Activo' ? 'badge-active' : 'badge-inactive'}">${escapeHtml(e.estado)}</span></td>
        <td style="font-size:0.78rem;">${escapeHtml(e.correo || e.correo_empresarial || '—')}</td>
        <td class="td-actions">
          <a href="/form_empleado.html?id=${e.id_empleado}" class="btn btn-ghost btn-sm btn-icon" title="Editar">✏️</a>
          <button class="btn btn-ghost btn-sm btn-icon" title="Reasignar dependencia"
            data-nombre="${escapeHtml(e.nombre_completo || '')}"
            onclick="abrirReasignar(${e.id_empleado}, this.dataset.nombre)">🔄</button>
        </td>
      </tr>`;
  }).join('');

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

  for(let i = Math.max(1, page-2); i <= Math.min(pages, page+2); i++){
    ctrl.appendChild(btn(i, i, i===page, false));
  }

  ctrl.appendChild(btn('›', page+1, false, page>=pages));
}

function buscar(){ cargar(1); }
function limpiar(){
  document.getElementById('search-nombre').value = '';
  document.getElementById('search-dependencia').value = '';
  document.getElementById('search-estado').value = '';
  cargar(1);
}

/* ═══════════════════ MODAL NUEVA DEPENDENCIA ═════════════════ */
function abrirCrearDep(){
  document.getElementById('dep-input').value = '';
  abrirModal('modal-dependencia');
}

async function crearDependencia(){
  const nombre = document.getElementById('dep-input').value.trim();
  if(!nombre){ showToast('El nombre es obligatorio.', 'error'); return; }
  
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/dependencias`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({nombre_dependencia: nombre})
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    showToast(d.mensaje || 'Dependencia creada.', 'success');
    cerrarModal('modal-dependencia');
    cargarDeps();
  }catch(e){ showToast('Error al crear.', 'error'); }
}

/* ══════════════════════════ FORMULARIO ══════════════════════════ */
if(typeof EMPLEADO_ID !== 'undefined'){
  document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    await cargarDepsForm();
    if(EMPLEADO_ID) cargarDatos(EMPLEADO_ID);
  });
}

async function cargarDepsForm(){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/dependencias`, {
      headers: getHeaders(false)
    });
    const data = await res.json();
    const sel = document.getElementById('id_dependencia');
    if(!sel) return;
    sel.innerHTML = '<option value="">Sin asignar</option>';
    data.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id_dependencia;
      o.textContent = d.nombre_dependencia;
      sel.appendChild(o);
    });
  }catch(e){ console.error('Error cargando dependencias:', e); }
}

async function cargarDatos(id){
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/empleados/${id}`, {
      headers: getHeaders(false)
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    
    document.getElementById('form-title').textContent = 'Editar Empleado';
    document.getElementById('form-breadcrumb').textContent = 'Editar';
    document.getElementById('numero_empleado').value = d.numero_empleado || '';
    document.getElementById('numero_empleado').disabled = true;
    document.getElementById('dpi').value = d.dpi || '';
    document.getElementById('dpi').disabled = true;
    document.getElementById('nombre_completo').value = d.nombre_completo || '';
    document.getElementById('cargo').value = d.cargo || '';
    document.getElementById('id_dependencia').value = d.id_dependencia || '';
    document.getElementById('estado').value = d.estado || 'Activo';
    document.getElementById('fecha_nacimiento').value = d.fecha_nacimiento || '';
    document.getElementById('telefono').value = d.telefono || '';
    document.getElementById('correo').value = d.correo || '';
    document.getElementById('correo_empresarial').value = d.correo_empresarial || '';
    document.getElementById('correo_personal').value = d.correo_personal || '';
    document.getElementById('red_social').value = d.red_social || '';
    document.getElementById('direccion').value = d.direccion || '';
  }catch(e){ showToast('Error al cargar datos.', 'error'); }
}

async function guardar(){
  const nombre = document.getElementById('nombre_completo').value.trim();
  const numEmp = document.getElementById('numero_empleado')?.value.trim();
  const dpi = document.getElementById('dpi')?.value.trim();
  const corrEmp = document.getElementById('correo_empresarial')?.value.trim();
  const telefono = document.getElementById('telefono')?.value.trim();
  const isEdit = typeof EMPLEADO_ID !== 'undefined' && EMPLEADO_ID;

  if(!nombre){ showToast('El nombre completo es obligatorio.', 'error'); return; }
  if(!isEdit && !numEmp){ showToast('El número de empleado es obligatorio.', 'error'); return; }
  if(!isEdit && !dpi){ showToast('El DPI es obligatorio.', 'error'); return; }
  if(telefono && !/^\d{7,15}$/.test(telefono.replace(/[\s\-\+\(\)]/g, '')))
    { showToast('Teléfono inválido (7-15 dígitos).', 'error'); return; }
  if(corrEmp && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corrEmp))
    { showToast('Correo empresarial inválido.', 'error'); return; }

  const payload = {
    numero_empleado: numEmp,
    dpi,
    nombre_completo: nombre,
    cargo: document.getElementById('cargo').value.trim() || null,
    id_dependencia: document.getElementById('id_dependencia').value || null,
    estado: document.getElementById('estado').value,
    fecha_nacimiento: document.getElementById('fecha_nacimiento').value || null,
    correo: document.getElementById('correo')?.value.trim() || null,
    correo_empresarial: corrEmp || null,
    correo_personal: document.getElementById('correo_personal')?.value.trim() || null,
    telefono: telefono || null,
    direccion: document.getElementById('direccion').value.trim() || null,
    red_social: document.getElementById('red_social')?.value.trim() || null,
  };

  const btn = document.querySelector('.btn-gold');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try{
    const url = isEdit 
      ? `${CONFIG.API_BASE_URL}/api/empleados/${EMPLEADO_ID}` 
      : `${CONFIG.API_BASE_URL}/api/empleados`;
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
    showToast(data.mensaje || 'Operación exitosa.', 'success');
    setTimeout(() => window.location.href = '/empleados.html', 1200);
  }catch(e){
    showToast('Error al guardar.', 'error');
    btn.disabled = false;
    btn.textContent = '💾 Guardar';
  }
}

/* ═══════════════════ REASIGNAR DEPENDENCIA ══════════════════ */
let pendingReasignarId = null;

async function abrirReasignar(id, nombre){
  pendingReasignarId = id;
  document.getElementById('dep-actual-nombre').textContent = nombre;
  document.getElementById('motivo-reasignar').value = '';
  document.getElementById('fecha-efectiva-reasignar').value = '';

  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/dependencias`, {
      headers: getHeaders(false)
    });
    const data = await res.json();
    const sel = document.getElementById('dep-nueva');
    sel.innerHTML = '<option value="">Selecciona...</option>';
    data.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id_dependencia;
      o.textContent = d.nombre_dependencia;
      sel.appendChild(o);
    });
  }catch(e){ console.error('Error cargando dependencias:', e); }

  abrirModal('modal-reasignar');
}

async function confirmarReasignar(){
  const dep = document.getElementById('dep-nueva').value;
  const motivo = document.getElementById('motivo-reasignar').value.trim();
  const fecha = document.getElementById('fecha-efectiva-reasignar').value;
  
  if(!dep){ showToast('Selecciona la nueva dependencia.', 'error'); return; }
  if(!motivo){ showToast('El motivo es obligatorio.', 'error'); return; }
  
  try{
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/empleados/${pendingReasignarId}/reasignar`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        id_dependencia_nueva: parseInt(dep),
        motivo,
        fecha_efectiva: fecha || null
      })
    });
    const d = await res.json();
    if(d.error){ showToast(d.error, 'error'); return; }
    showToast(d.mensaje || 'Reasignación exitosa.', 'success');
    cerrarModal('modal-reasignar');
    cargar(1);
  }catch(e){ showToast('Error.', 'error'); }
}

/* =========================================================
   Jerarquía Empleados: Cargo / Supervisor / Manager
   ========================================================= */

async function cargarCargosJerarquia() {
  const select = document.getElementById('id_cargo');
  if (!select) return;

  try {
    const cargos = await apiJSON('/api/empleados/cargos');

    select.innerHTML = '<option value="">Seleccione un cargo</option>';

    (cargos || []).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_cargo;
      opt.textContent = c.nombre_cargo;
      opt.dataset.nivel = c.nivel_cargo;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error al cargar cargos:', error);
    showToast('No se pudieron cargar los cargos.', 'error');
  }
}

async function cargarSupervisoresJerarquia() {
  const select = document.getElementById('id_supervisor');
  if (!select) return;

  try {
    const supervisores = await apiJSON('/api/empleados/supervisores');

    select.innerHTML = '<option value="">Seleccione un supervisor</option>';

    (supervisores || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id_empleado;
      opt.textContent = s.nombre_completo;
      opt.dataset.idManager = s.id_manager || '';
      opt.dataset.manager = s.manager || '';
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error al cargar supervisores:', error);
    showToast('No se pudieron cargar los supervisores.', 'error');
  }
}

async function cargarManagersJerarquia() {
  const select = document.getElementById('id_manager');
  if (!select) return;

  try {
    const managers = await apiJSON('/api/empleados/managers');

    select.innerHTML = '<option value="">Seleccione un manager</option>';

    (managers || []).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id_empleado;
      opt.textContent = m.nombre_completo;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error al cargar managers:', error);
    showToast('No se pudieron cargar los managers.', 'error');
  }
}

function obtenerNivelCargoSeleccionado() {
  const select = document.getElementById('id_cargo');
  const opt = select?.selectedOptions?.[0];
  return opt?.dataset?.nivel || '';
}

function manejarCambioCargo() {
  const nivel = obtenerNivelCargoSeleccionado();

  const grupoSupervisor = document.getElementById('grupo_supervisor');
  const grupoManager = document.getElementById('grupo_manager');

  const idCargo = document.getElementById('id_cargo');
  const cargoHidden = document.getElementById('cargo');
  const idSupervisor = document.getElementById('id_supervisor');
  const idManager = document.getElementById('id_manager');

  if (cargoHidden && idCargo) {
    const textoCargo = idCargo.selectedOptions?.[0]?.textContent || '';
    cargoHidden.value = idCargo.value ? textoCargo : '';
  }

  if (!idSupervisor || !idManager) return;

  if (nivel === 'MANAGER') {
    idSupervisor.value = '';
    idManager.value = '';
    idSupervisor.disabled = true;
    idManager.disabled = true;

    if (grupoSupervisor) grupoSupervisor.style.display = 'none';
    if (grupoManager) grupoManager.style.display = 'none';
    return;
  }

  if (nivel === 'SUPERVISOR') {
    idSupervisor.value = '';
    idSupervisor.disabled = true;
    idManager.disabled = false;

    if (grupoSupervisor) grupoSupervisor.style.display = 'none';
    if (grupoManager) grupoManager.style.display = '';
    return;
  }

  idSupervisor.disabled = false;
  idManager.disabled = true;

  if (grupoSupervisor) grupoSupervisor.style.display = '';
  if (grupoManager) grupoManager.style.display = '';
}

async function cargarManagerPorSupervisor() {
  const idSupervisor = document.getElementById('id_supervisor')?.value;
  const idManager = document.getElementById('id_manager');

  if (!idManager) return;

  if (!idSupervisor) {
    idManager.value = '';
    return;
  }

  try {
    const manager = await apiJSON(`/api/empleados/manager-por-supervisor/${idSupervisor}`);

    if (manager && manager.id_manager) {
      idManager.value = String(manager.id_manager);
    } else {
      idManager.value = '';
      showToast('El supervisor seleccionado no tiene manager asignado.', 'warning');
    }
  } catch (error) {
    console.error('Error al obtener manager del supervisor:', error);
    showToast('No se pudo obtener el manager del supervisor.', 'error');
  }
}

function calcularDiasCumpleanos() {
  const inputFecha = document.getElementById('fecha_nacimiento');
  const inputDias = document.getElementById('dias_cumpleanos');

  if (!inputFecha || !inputDias) return;

  const valor = inputFecha.value;
  if (!valor) {
    inputDias.value = '';
    return;
  }

  const hoy = new Date();
  const nacimiento = new Date(valor + 'T00:00:00');

  let proximo = new Date(
    hoy.getFullYear(),
    nacimiento.getMonth(),
    nacimiento.getDate()
  );

  hoy.setHours(0, 0, 0, 0);

  if (proximo < hoy) {
    proximo.setFullYear(hoy.getFullYear() + 1);
  }

  const msDia = 1000 * 60 * 60 * 24;
  const dias = Math.ceil((proximo - hoy) / msDia);

  if (dias === 0) {
    inputDias.value = 'Hoy es su cumpleaños';
  } else if (dias === 1) {
    inputDias.value = 'Falta 1 día';
  } else {
    inputDias.value = `Faltan ${dias} días`;
  }
}

/* 
   Sobrescribimos guardar() para enviar los nuevos campos:
   id_cargo, id_supervisor, id_manager
*/
async function guardar() {
  const numeroEmpleado = document.getElementById('numero_empleado')?.value.trim();
  const dpi = document.getElementById('dpi')?.value.trim();
  const nombreCompleto = document.getElementById('nombre_completo')?.value.trim();
  const idCargo = document.getElementById('id_cargo')?.value;

  if (!numeroEmpleado || !dpi || !nombreCompleto || !idCargo) {
    showToast('Número de empleado, DPI, nombre completo y cargo son obligatorios.', 'warning');
    return;
  }

  manejarCambioCargo();

  const payload = {
    numero_empleado: numeroEmpleado,
    dpi: dpi,
    nombre_completo: nombreCompleto,
    id_cargo: idCargo || null,
    cargo: document.getElementById('cargo')?.value || null,
    id_dependencia: document.getElementById('id_dependencia')?.value || null,
    id_supervisor: document.getElementById('id_supervisor')?.value || null,
    id_manager: document.getElementById('id_manager')?.value || null,
    estado: document.getElementById('estado')?.value || 'Activo',
    fecha_nacimiento: document.getElementById('fecha_nacimiento')?.value || null,
    correo: document.getElementById('correo')?.value.trim() || null,
    correo_empresarial: document.getElementById('correo_empresarial')?.value.trim() || null,
    correo_personal: document.getElementById('correo_personal')?.value.trim() || null,
    red_social: document.getElementById('red_social')?.value.trim() || null,
    telefono: document.getElementById('telefono')?.value.trim() || null,
    direccion: document.getElementById('direccion')?.value.trim() || null
  };

  try {
    const endpoint = EMPLEADO_ID ? `/api/empleados/${EMPLEADO_ID}` : '/api/empleados';
    const method = EMPLEADO_ID ? 'PUT' : 'POST';

    const resp = await apiJSON(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    showToast(resp?.mensaje || 'Empleado guardado correctamente.', 'success');

    setTimeout(() => {
      window.location.href = '/empleados.html';
    }, 900);
  } catch (error) {
    console.error('Error al guardar empleado:', error);
    showToast(error.message || 'Error al guardar empleado.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('id_cargo')) return;

  try {
    await cargarCargosJerarquia();
    await cargarManagersJerarquia();
    await cargarSupervisoresJerarquia();

    manejarCambioCargo();
    calcularDiasCumpleanos();

    const fechaNacimiento = document.getElementById('fecha_nacimiento');
    if (fechaNacimiento) {
      fechaNacimiento.addEventListener('change', calcularDiasCumpleanos);
    }
  } catch (error) {
    console.error('Error inicializando jerarquía:', error);
  }
});